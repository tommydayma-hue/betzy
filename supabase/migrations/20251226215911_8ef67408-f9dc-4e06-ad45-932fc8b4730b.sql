-- Create a new function that accepts the result from external API
CREATE OR REPLACE FUNCTION public.settle_coinflip_round_with_result(p_round_id uuid, p_result text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.coinflip_rounds;
  v_bet RECORD;
  v_winners_count INT := 0;
  v_losers_count INT := 0;
  v_total_payout NUMERIC := 0;
BEGIN
  -- Validate result
  IF p_result NOT IN ('heads', 'tails') THEN
    RAISE EXCEPTION 'Invalid result. Must be heads or tails';
  END IF;

  -- Get the round
  SELECT * INTO v_round FROM public.coinflip_rounds WHERE id = p_round_id;
  
  IF v_round IS NULL THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  IF v_round.is_settled THEN
    RETURN json_build_object('success', true, 'message', 'Round already settled', 'result', v_round.result);
  END IF;

  -- Update round with the provided result (from external API)
  UPDATE public.coinflip_rounds
  SET result = p_result, is_settled = true
  WHERE id = p_round_id;

  -- Process all bets for this round
  FOR v_bet IN 
    SELECT * FROM public.coinflip_bets WHERE round_id = p_round_id AND status = 'pending'
  LOOP
    IF v_bet.choice = p_result THEN
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

      v_losers_count := v_losers_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'result', p_result,
    'winners', v_winners_count,
    'losers', v_losers_count,
    'total_payout', v_total_payout
  );
END;
$$;