CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: bet_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bet_status AS ENUM (
    'pending',
    'won',
    'lost',
    'cancelled',
    'refunded'
);


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status AS ENUM (
    'upcoming',
    'live',
    'completed',
    'cancelled'
);


--
-- Name: transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'deposit',
    'withdrawal',
    'bet_placed',
    'bet_won',
    'bet_refunded',
    'bonus'
);


--
-- Name: auto_approve_deposit(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_approve_deposit(p_user_id uuid, p_amount numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Add amount to user's wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE user_id = p_user_id;
END;
$$;


--
-- Name: cancel_bet(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_bet(p_bet_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bet RECORD;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the bet
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id;
  
  IF v_bet IS NULL THEN
    RAISE EXCEPTION 'Bet not found';
  END IF;
  
  -- Check ownership
  IF v_bet.user_id != v_user_id THEN
    RAISE EXCEPTION 'You can only cancel your own bets';
  END IF;
  
  -- Check if bet is still pending
  IF v_bet.status != 'pending' THEN
    RAISE EXCEPTION 'Only pending bets can be cancelled';
  END IF;

  -- Refund the bet amount to user's wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_bet.amount
  WHERE user_id = v_user_id;

  -- Update bet status to cancelled
  UPDATE public.bets
  SET status = 'cancelled', settled_at = now()
  WHERE id = p_bet_id;

  -- Create refund transaction record
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
  VALUES (v_user_id, 'bet_refunded', v_bet.amount, 'completed', p_bet_id, 'Bet cancelled - refund');
END;
$$;


SET default_table_access_method = heap;

--
-- Name: coinflip_rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coinflip_rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_number integer NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    result text,
    is_settled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coinflip_rounds_result_check CHECK ((result = ANY (ARRAY['heads'::text, 'tails'::text])))
);


--
-- Name: get_or_create_current_round(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_current_round() RETURNS public.coinflip_rounds
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_round public.coinflip_rounds;
  round_duration INTERVAL := '15 seconds';
  new_start TIMESTAMP WITH TIME ZONE;
  new_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Try to get an active round (not yet ended)
  SELECT * INTO current_round
  FROM public.coinflip_rounds
  WHERE ends_at > now() AND is_settled = false
  ORDER BY ends_at DESC
  LIMIT 1;

  -- If no active round, create a new one
  IF current_round IS NULL THEN
    -- Calculate start time aligned to 15-second intervals
    new_start := date_trunc('minute', now()) + 
                 (floor(extract(second from now()) / 15) * 15) * INTERVAL '1 second';
    
    -- If that time has passed, move to next interval
    IF new_start <= now() THEN
      new_start := new_start + round_duration;
    END IF;
    
    new_end := new_start + round_duration;

    INSERT INTO public.coinflip_rounds (starts_at, ends_at)
    VALUES (new_start, new_end)
    RETURNING * INTO current_round;
  END IF;

  RETURN current_round;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;


--
-- Name: place_bet(uuid, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_bet(p_match_id uuid, p_bet_type text, p_amount numeric) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_match RECORD;
  v_odds DECIMAL;
  v_potential_winnings DECIMAL;
  v_bet_id UUID;
  v_current_balance DECIMAL;
  v_existing_bet UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already bet on this match
  SELECT id INTO v_existing_bet
  FROM public.bets
  WHERE user_id = v_user_id AND match_id = p_match_id;
  
  IF v_existing_bet IS NOT NULL THEN
    RAISE EXCEPTION 'You have already placed a bet on this match';
  END IF;

  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Get match and validate
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  
  IF v_match IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Betting is only allowed on live matches';
  END IF;

  -- Check closing time
  IF v_match.closing_time IS NOT NULL AND now() > v_match.closing_time THEN
    RAISE EXCEPTION 'Betting time has closed for this match';
  END IF;

  -- Check max bet
  IF v_match.max_bet IS NOT NULL AND p_amount > v_match.max_bet THEN
    RAISE EXCEPTION 'Maximum bet amount is ₹%', v_match.max_bet;
  END IF;

  -- Get odds based on bet type (for toss, both teams have same odds)
  CASE p_bet_type
    WHEN 'team_a' THEN v_odds := v_match.odds_team_a;
    WHEN 'team_b' THEN v_odds := v_match.odds_team_b;
    ELSE RAISE EXCEPTION 'Invalid bet type. Choose team_a or team_b';
  END CASE;

  IF v_odds IS NULL THEN
    RAISE EXCEPTION 'Odds not available for this bet type';
  END IF;

  v_potential_winnings := p_amount * v_odds;

  -- Deduct from wallet immediately
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount
  WHERE user_id = v_user_id;

  -- Create bet
  INSERT INTO public.bets (user_id, match_id, bet_type, amount, odds, potential_winnings)
  VALUES (v_user_id, p_match_id, p_bet_type, p_amount, v_odds, v_potential_winnings)
  RETURNING id INTO v_bet_id;

  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
  VALUES (v_user_id, 'bet_placed', -p_amount, 'completed', v_bet_id, 
          'Toss bet: ' || v_match.team_a || ' vs ' || v_match.team_b);

  RETURN v_bet_id;
END;
$$;


--
-- Name: place_coinflip_bet(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_coinflip_bet(p_choice text, p_amount numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_current_round public.coinflip_rounds;
  v_profile public.profiles;
  v_bet public.coinflip_bets;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate choice
  IF p_choice NOT IN ('heads', 'tails') THEN
    RAISE EXCEPTION 'Invalid choice. Must be heads or tails';
  END IF;

  -- Validate amount
  IF p_amount < 10 THEN
    RAISE EXCEPTION 'Minimum bet is ₹10';
  END IF;

  -- Get user profile and check balance
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.wallet_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Get or create current round
  v_current_round := get_or_create_current_round();

  -- Check if betting is still open (must be at least 2 seconds before end)
  IF v_current_round.ends_at - INTERVAL '2 seconds' < now() THEN
    RAISE EXCEPTION 'Betting closed for this round';
  END IF;

  -- Check if user already bet on this round
  IF EXISTS (
    SELECT 1 FROM public.coinflip_bets 
    WHERE round_id = v_current_round.id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You already placed a bet on this round';
  END IF;

  -- Deduct balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Create bet
  INSERT INTO public.coinflip_bets (round_id, user_id, choice, amount)
  VALUES (v_current_round.id, v_user_id, p_choice, p_amount)
  RETURNING * INTO v_bet;

  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_user_id, 'bet_placed', p_amount, 'completed', 
          'Coin flip bet - ' || p_choice || ' - Round #' || v_current_round.round_number);

  RETURN json_build_object(
    'success', true,
    'bet_id', v_bet.id,
    'round_id', v_current_round.id,
    'round_number', v_current_round.round_number,
    'ends_at', v_current_round.ends_at
  );
END;
$$;


--
-- Name: play_coinflip(numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.play_coinflip(p_amount numeric, p_choice text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_current_balance DECIMAL;
  v_result TEXT;
  v_won BOOLEAN;
  v_payout DECIMAL;
  v_win_percentage DECIMAL;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate choice
  IF p_choice NOT IN ('heads', 'tails') THEN
    RAISE EXCEPTION 'Invalid choice. Must be heads or tails';
  END IF;

  -- Validate amount
  IF p_amount < 10 THEN
    RAISE EXCEPTION 'Minimum bet is ₹10';
  END IF;

  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₹%', v_current_balance;
  END IF;

  -- Get win percentage from settings (default 50 if not set)
  SELECT COALESCE((value->>'win_percentage')::decimal, 50)
  INTO v_win_percentage
  FROM public.site_settings
  WHERE key = 'coinflip_config';
  
  IF v_win_percentage IS NULL THEN
    v_win_percentage := 50;
  END IF;

  -- Generate random result based on win percentage
  -- random() returns 0-1, so if random() < (win_percentage/100), user wins
  IF random() * 100 < v_win_percentage THEN
    -- User wins - result matches their choice
    v_result := p_choice;
    v_won := true;
  ELSE
    -- User loses - result is opposite of their choice
    IF p_choice = 'heads' THEN
      v_result := 'tails';
    ELSE
      v_result := 'heads';
    END IF;
    v_won := false;
  END IF;

  IF v_won THEN
    -- User wins: add winnings (bet amount, since they keep their bet + win same amount)
    v_payout := p_amount;
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_payout
    WHERE user_id = v_user_id;

    -- Record win transaction
    INSERT INTO public.transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'bet_won', v_payout, 'completed', 'Coin flip win - chose ' || p_choice);
  ELSE
    -- User loses: deduct bet amount
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - p_amount
    WHERE user_id = v_user_id;

    -- Record loss transaction
    INSERT INTO public.transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'bet_placed', -p_amount, 'completed', 'Coin flip loss - chose ' || p_choice);
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'result', v_result,
    'choice', p_choice,
    'won', v_won,
    'amount', p_amount,
    'payout', CASE WHEN v_won THEN p_amount * 2 ELSE 0 END
  );
END;
$$;


--
-- Name: process_deposit(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_deposit(p_transaction_id uuid, p_approved boolean, p_admin_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;
  
  IF v_transaction.type != 'deposit' THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF p_approved THEN
    -- Approve deposit - add to wallet
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_transaction.amount
    WHERE user_id = v_transaction.user_id;

    UPDATE public.transactions
    SET status = 'completed',
        processed_by = auth.uid(),
        processed_at = now(),
        admin_notes = p_admin_notes
    WHERE id = p_transaction_id;
  ELSE
    -- Reject deposit
    UPDATE public.transactions
    SET status = 'failed',
        processed_by = auth.uid(),
        processed_at = now(),
        admin_notes = p_admin_notes
    WHERE id = p_transaction_id;
  END IF;
END;
$$;


--
-- Name: process_withdrawal(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_withdrawal(p_transaction_id uuid, p_approved boolean, p_admin_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_transaction RECORD;
  v_current_balance DECIMAL;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;
  
  IF v_transaction.type != 'withdrawal' THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF p_approved THEN
    -- Check current balance
    SELECT wallet_balance INTO v_current_balance
    FROM public.profiles
    WHERE user_id = v_transaction.user_id;

    IF v_current_balance < ABS(v_transaction.amount) THEN
      RAISE EXCEPTION 'Insufficient user balance';
    END IF;

    -- Deduct from wallet
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - ABS(v_transaction.amount)
    WHERE user_id = v_transaction.user_id;

    UPDATE public.transactions
    SET status = 'completed',
        processed_by = auth.uid(),
        processed_at = now(),
        admin_notes = p_admin_notes
    WHERE id = p_transaction_id;
  ELSE
    -- Reject withdrawal
    UPDATE public.transactions
    SET status = 'failed',
        processed_by = auth.uid(),
        processed_at = now(),
        admin_notes = p_admin_notes
    WHERE id = p_transaction_id;
  END IF;
END;
$$;


--
-- Name: settle_bet(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_bet(p_bet_id uuid, p_won boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bet RECORD;
BEGIN
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id;
  
  IF v_bet IS NULL THEN
    RAISE EXCEPTION 'Bet not found';
  END IF;
  
  IF v_bet.status != 'pending' THEN
    RAISE EXCEPTION 'Bet already settled';
  END IF;

  IF p_won THEN
    -- Update bet status
    UPDATE public.bets
    SET status = 'won', settled_at = now()
    WHERE id = p_bet_id;

    -- Credit winnings to wallet
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_bet.potential_winnings
    WHERE user_id = v_bet.user_id;

    -- Create transaction record
    INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
    VALUES (v_bet.user_id, 'bet_won', v_bet.potential_winnings, 'completed', p_bet_id, 'Bet winnings');
  ELSE
    -- Update bet status
    UPDATE public.bets
    SET status = 'lost', settled_at = now()
    WHERE id = p_bet_id;
  END IF;
END;
$$;


--
-- Name: settle_coinflip_round(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_coinflip_round(p_round_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_round public.coinflip_rounds;
  v_result TEXT;
  v_bet RECORD;
  v_winners_count INT := 0;
  v_losers_count INT := 0;
  v_total_payout NUMERIC := 0;
BEGIN
  -- Get the round
  SELECT * INTO v_round FROM public.coinflip_rounds WHERE id = p_round_id;
  
  IF v_round IS NULL THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  IF v_round.is_settled THEN
    RETURN json_build_object('success', true, 'message', 'Round already settled', 'result', v_round.result);
  END IF;

  -- Generate random result
  IF random() < 0.5 THEN
    v_result := 'heads';
  ELSE
    v_result := 'tails';
  END IF;

  -- Update round with result
  UPDATE public.coinflip_rounds
  SET result = v_result, is_settled = true
  WHERE id = p_round_id;

  -- Process all bets for this round
  FOR v_bet IN 
    SELECT * FROM public.coinflip_bets WHERE round_id = p_round_id AND status = 'pending'
  LOOP
    IF v_bet.choice = v_result THEN
      -- Winner! Pay out 2x
      UPDATE public.coinflip_bets
      SET status = 'won', payout = v_bet.amount * 2
      WHERE id = v_bet.id;

      UPDATE public.profiles
      SET wallet_balance = wallet_balance + (v_bet.amount * 2),
          updated_at = now()
      WHERE user_id = v_bet.user_id;

      INSERT INTO public.transactions (user_id, type, amount, status, description)
      VALUES (v_bet.user_id, 'bet_won', v_bet.amount * 2, 'completed',
              'Coin flip win - chose ' || v_bet.choice);

      v_winners_count := v_winners_count + 1;
      v_total_payout := v_total_payout + (v_bet.amount * 2);
    ELSE
      -- Loser
      UPDATE public.coinflip_bets
      SET status = 'lost'
      WHERE id = v_bet.id;

      INSERT INTO public.transactions (user_id, type, amount, status, description)
      VALUES (v_bet.user_id, 'bet_placed', 0, 'completed',
              'Coin flip loss - chose ' || v_bet.choice);

      v_losers_count := v_losers_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'result', v_result,
    'winners', v_winners_count,
    'losers', v_losers_count,
    'total_payout', v_total_payout
  );
END;
$$;


--
-- Name: settle_toss_bets(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_toss_bets(p_match_id uuid, p_toss_winner text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bet RECORD;
  v_winners_count INTEGER := 0;
  v_losers_count INTEGER := 0;
  v_total_payout DECIMAL := 0;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Validate winner
  IF p_toss_winner NOT IN ('team_a', 'team_b') THEN
    RAISE EXCEPTION 'Invalid toss winner. Must be team_a or team_b';
  END IF;

  -- Update match with toss winner and mark as completed
  UPDATE public.matches
  SET toss_winner = p_toss_winner,
      status = 'completed'
  WHERE id = p_match_id;

  -- Process all pending bets for this match
  FOR v_bet IN 
    SELECT * FROM public.bets 
    WHERE match_id = p_match_id AND status = 'pending'
  LOOP
    IF v_bet.bet_type = p_toss_winner THEN
      -- Winner! Credit their winnings
      UPDATE public.bets
      SET status = 'won', settled_at = now()
      WHERE id = v_bet.id;

      UPDATE public.profiles
      SET wallet_balance = wallet_balance + v_bet.potential_winnings
      WHERE user_id = v_bet.user_id;

      INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
      VALUES (v_bet.user_id, 'bet_won', v_bet.potential_winnings, 'completed', v_bet.id, 'Toss bet won');

      v_winners_count := v_winners_count + 1;
      v_total_payout := v_total_payout + v_bet.potential_winnings;
    ELSE
      -- Loser - just update status (money already deducted)
      UPDATE public.bets
      SET status = 'lost', settled_at = now()
      WHERE id = v_bet.id;

      v_losers_count := v_losers_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'match_id', p_match_id,
    'toss_winner', p_toss_winner,
    'winners_count', v_winners_count,
    'losers_count', v_losers_count,
    'total_payout', v_total_payout
  );
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_holder_name text NOT NULL,
    account_number text NOT NULL,
    ifsc_code text,
    bank_name text,
    account_type text DEFAULT 'savings'::text,
    upi_id text,
    phone_pay_number text,
    google_pay_number text,
    paytm_number text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    match_id uuid NOT NULL,
    bet_type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    odds numeric(5,2) NOT NULL,
    potential_winnings numeric(12,2) NOT NULL,
    status public.bet_status DEFAULT 'pending'::public.bet_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT bets_amount_check CHECK ((amount > (0)::numeric))
);

ALTER TABLE ONLY public.bets REPLICA IDENTITY FULL;


--
-- Name: coinflip_bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coinflip_bets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    user_id uuid NOT NULL,
    choice text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payout numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coinflip_bets_amount_check CHECK ((amount >= (10)::numeric)),
    CONSTRAINT coinflip_bets_choice_check CHECK ((choice = ANY (ARRAY['heads'::text, 'tails'::text]))),
    CONSTRAINT coinflip_bets_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text])))
);


--
-- Name: coinflip_rounds_round_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coinflip_rounds_round_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coinflip_rounds_round_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coinflip_rounds_round_number_seq OWNED BY public.coinflip_rounds.round_number;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sport text NOT NULL,
    league text,
    team_a text NOT NULL,
    team_b text NOT NULL,
    team_a_logo text,
    team_b_logo text,
    odds_team_a numeric(5,2) DEFAULT 1.00 NOT NULL,
    odds_team_b numeric(5,2) DEFAULT 1.00 NOT NULL,
    odds_draw numeric(5,2),
    start_time timestamp with time zone NOT NULL,
    status public.match_status DEFAULT 'upcoming'::public.match_status NOT NULL,
    score_team_a integer,
    score_team_b integer,
    winner text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    max_bet numeric DEFAULT 100000.00,
    closing_time timestamp with time zone,
    extra_time timestamp with time zone,
    toss_winner text,
    CONSTRAINT matches_toss_winner_check CHECK ((toss_winner = ANY (ARRAY['team_a'::text, 'team_b'::text, NULL::text])))
);

ALTER TABLE ONLY public.matches REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    username text,
    wallet_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.transaction_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    status public.transaction_status DEFAULT 'pending'::public.transaction_status NOT NULL,
    reference_id uuid,
    description text,
    screenshot_url text,
    admin_notes text,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coinflip_rounds round_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coinflip_rounds ALTER COLUMN round_number SET DEFAULT nextval('public.coinflip_rounds_round_number_seq'::regclass);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bets bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_pkey PRIMARY KEY (id);


--
-- Name: coinflip_bets coinflip_bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coinflip_bets
    ADD CONSTRAINT coinflip_bets_pkey PRIMARY KEY (id);


--
-- Name: coinflip_rounds coinflip_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coinflip_rounds
    ADD CONSTRAINT coinflip_rounds_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_bets_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_match_id ON public.bets USING btree (match_id);


--
-- Name: idx_bets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_status ON public.bets USING btree (status);


--
-- Name: idx_bets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_user_id ON public.bets USING btree (user_id);


--
-- Name: idx_matches_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_start_time ON public.matches USING btree (start_time);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: bank_accounts update_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: matches update_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bets bets_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: bets bets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: coinflip_bets coinflip_bets_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coinflip_bets
    ADD CONSTRAINT coinflip_bets_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.coinflip_rounds(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: coinflip_rounds Admins can manage coinflip rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage coinflip rounds" ON public.coinflip_rounds USING (public.is_admin());


--
-- Name: matches Admins can manage matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage matches" ON public.matches USING (public.is_admin());


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.is_admin());


--
-- Name: site_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.site_settings USING (public.is_admin());


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());


--
-- Name: bets Admins can update bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update bets" ON public.bets FOR UPDATE USING (public.is_admin());


--
-- Name: coinflip_bets Admins can update coinflip bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update coinflip bets" ON public.coinflip_bets FOR UPDATE USING (public.is_admin());


--
-- Name: transactions Admins can update transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (public.is_admin());


--
-- Name: bets Admins can view all bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all bets" ON public.bets FOR SELECT USING (public.is_admin());


--
-- Name: coinflip_bets Admins can view all coinflip bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all coinflip bets" ON public.coinflip_bets FOR SELECT USING (public.is_admin());


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin());


--
-- Name: transactions Admins can view all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.is_admin());


--
-- Name: site_settings Admins can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view settings" ON public.site_settings FOR SELECT USING (public.is_admin());


--
-- Name: coinflip_rounds Anyone can view coinflip rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view coinflip rounds" ON public.coinflip_rounds FOR SELECT USING (true);


--
-- Name: matches Anyone can view matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);


--
-- Name: transactions Users can create deposit/withdrawal requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deposit/withdrawal requests" ON public.transactions FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (type = ANY (ARRAY['deposit'::public.transaction_type, 'withdrawal'::public.transaction_type]))));


--
-- Name: bank_accounts Users can create their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bank accounts" ON public.bank_accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bets Users can create their own bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bets" ON public.bets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: coinflip_bets Users can create their own coinflip bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own coinflip bets" ON public.coinflip_bets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_accounts Users can delete their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bank accounts" ON public.bank_accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_accounts Users can update their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bank accounts" ON public.bank_accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bank_accounts Users can view their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bank accounts" ON public.bank_accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bets Users can view their own bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bets" ON public.bets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: coinflip_bets Users can view their own coinflip bets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own coinflip bets" ON public.coinflip_bets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: bets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

--
-- Name: coinflip_bets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coinflip_bets ENABLE ROW LEVEL SECURITY;

--
-- Name: coinflip_rounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coinflip_rounds ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;