-- Drop and recreate the settle_toss_bets function to handle deadline
CREATE OR REPLACE FUNCTION public.settle_toss_bets(p_match_id uuid, p_toss_winner text, p_toss_time timestamp with time zone DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_bet RECORD;
  v_winners_count INTEGER := 0;
  v_losers_count INTEGER := 0;
  v_refunded_count INTEGER := 0;
  v_total_payout DECIMAL := 0;
  v_total_refunded DECIMAL := 0;
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
    -- If toss time is set and bet was placed after it, refund the bet
    IF p_toss_time IS NOT NULL AND v_bet.created_at > p_toss_time THEN
      -- Refund the bet
      UPDATE public.bets
      SET status = 'refunded', settled_at = now()
      WHERE id = v_bet.id;

      -- Return money to user
      UPDATE public.profiles
      SET wallet_balance = wallet_balance + v_bet.amount
      WHERE user_id = v_bet.user_id;

      INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
      VALUES (v_bet.user_id, 'bet_refunded', v_bet.amount, 'completed', v_bet.id, 'Bet refunded - placed after toss time');

      v_refunded_count := v_refunded_count + 1;
      v_total_refunded := v_total_refunded + v_bet.amount;
    ELSIF v_bet.bet_type = p_toss_winner THEN
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
    'refunded_count', v_refunded_count,
    'total_payout', v_total_payout,
    'total_refunded', v_total_refunded
  );
END;
$$;