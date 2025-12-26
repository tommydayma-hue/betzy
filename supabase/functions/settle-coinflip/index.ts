import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for rounds to settle...');

    // Find rounds that have ended but not settled
    const { data: expiredRounds, error: fetchError } = await supabase
      .from('coinflip_rounds')
      .select('*')
      .eq('is_settled', false)
      .lt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired rounds:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredRounds?.length || 0} rounds to settle`);

    const results = [];

    for (const round of expiredRounds || []) {
      console.log(`Settling round ${round.id} (Round #${round.round_number})`);
      
      // Call the settle function
      const { data, error } = await supabase.rpc('settle_coinflip_round', {
        p_round_id: round.id
      });

      if (error) {
        console.error(`Error settling round ${round.id}:`, error);
        results.push({ round_id: round.id, error: error.message });
      } else {
        console.log(`Round ${round.id} settled:`, data);
        results.push({ round_id: round.id, ...data });
      }
    }

    // Also ensure there's an active round for users
    const { data: currentRound, error: roundError } = await supabase.rpc('get_or_create_current_round');
    
    if (roundError) {
      console.error('Error getting/creating current round:', roundError);
    } else {
      console.log('Current active round:', currentRound);
    }

    return new Response(
      JSON.stringify({
        success: true,
        settled_count: results.length,
        results,
        current_round: currentRound
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in settle-coinflip:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
