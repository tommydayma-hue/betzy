import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Clock, History, Loader2, Wallet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { CoinFlipAnimation } from "@/components/coinflip/CoinFlipAnimation";

const CoinFlip = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedSide, setSelectedSide] = useState<"heads" | "tails" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [hasBetThisRound, setHasBetThisRound] = useState(false);
  const [currentBet, setCurrentBet] = useState<{ choice: string; amount: number } | null>(null);
  
  // Round state
  const [currentRound, setCurrentRound] = useState<{
    id: string;
    round_number: number;
    ends_at: string;
    result: string | null;
    is_settled: boolean;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [bettingClosed, setBettingClosed] = useState(false);
  
  // Results state
  const [pastResults, setPastResults] = useState<{ id: string; result: string }[]>([]);
  const [lastResult, setLastResult] = useState<{ result: string; won: boolean; amount: number } | null>(null);
  const [userBetHistory, setUserBetHistory] = useState<any[]>([]);
  
  // Animation state
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const quickAmounts = [10, 50, 100, 500, 1000];

  // Fetch current round
  const fetchCurrentRound = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_current_round');
      if (error) throw error;
      
      if (data) {
        setCurrentRound(data);
        
        // Check if user has bet on this round
        if (user) {
          const { data: betData } = await supabase
            .from('coinflip_bets')
            .select('*')
            .eq('round_id', data.id)
            .eq('user_id', user.id)
            .single();
          
          if (betData) {
            setHasBetThisRound(true);
            setCurrentBet({ choice: betData.choice, amount: betData.amount });
          } else {
            setHasBetThisRound(false);
            setCurrentBet(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current round:', error);
    }
  }, [user]);

  // Fetch past results
  const fetchPastResults = useCallback(async () => {
    const { data, error } = await supabase
      .from('coinflip_rounds')
      .select('id, result, round_number')
      .eq('is_settled', true)
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setPastResults(data.map(r => ({ id: r.id, result: r.result! })));
    }
  }, []);

  // Fetch user bet history
  const fetchUserBetHistory = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('coinflip_bets')
      .select('*, coinflip_rounds(round_number, result)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setUserBetHistory(data);
    }
  }, [user]);

  // Settle round via edge function
  const settleRound = useCallback(async () => {
    try {
      await supabase.functions.invoke('settle-coinflip');
    } catch (error) {
      console.error('Error settling round:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCurrentRound();
    fetchPastResults();
    fetchUserBetHistory();
  }, [fetchCurrentRound, fetchPastResults, fetchUserBetHistory]);

  // Countdown timer
  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(currentRound.ends_at).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeRemaining(remaining);
      setBettingClosed(remaining <= 2);

      // When round ends, settle and get new round
      if (remaining === 0) {
        // Start flip animation
        setIsFlipping(true);
        setShowAnimation(true);
        
        setTimeout(async () => {
          await settleRound();
          
          // Get the result from the settled round
          const { data: roundData } = await supabase
            .from('coinflip_rounds')
            .select('result')
            .eq('id', currentRound.id)
            .single();
          
          if (roundData?.result) {
            setFlipResult(roundData.result as "heads" | "tails");
          }
          
          // Check if user won
          if (currentBet && user) {
            const { data } = await supabase
              .from('coinflip_bets')
              .select('*, coinflip_rounds(result)')
              .eq('round_id', currentRound.id)
              .eq('user_id', user.id)
              .single();
            
            if (data) {
              const won = data.status === 'won';
              setLastResult({
                result: (data as any).coinflip_rounds?.result || '',
                won,
                amount: won ? data.payout : data.amount
              });
            }
          }
          
          // Reset for next round after animation
          setTimeout(async () => {
            setIsFlipping(false);
            
            setHasBetThisRound(false);
            setCurrentBet(null);
            setSelectedSide(null);
            setBetAmount("");
            
            await fetchCurrentRound();
            await fetchPastResults();
            await fetchUserBetHistory();
            await refreshProfile();
          }, 2500);
        }, 500);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [currentRound, currentBet, user, settleRound, fetchCurrentRound, fetchPastResults, fetchUserBetHistory, refreshProfile]);

  // Realtime subscription for round updates
  useEffect(() => {
    const channel = supabase
      .channel('coinflip-rounds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coinflip_rounds',
        },
        (payload) => {
          console.log('Round update:', payload);
          fetchCurrentRound();
          fetchPastResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCurrentRound, fetchPastResults]);

  const handlePlaceBet = async () => {
    if (!user) {
      toast.error("Please login to play");
      navigate("/login");
      return;
    }

    if (!selectedSide) {
      toast.error("Please select Head or Tail");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error("Minimum bet is ₹10");
      return;
    }

    if (profile && amount > Number(profile.wallet_balance)) {
      toast.error(`Insufficient balance. You have ₹${Number(profile.wallet_balance).toFixed(2)}`);
      return;
    }

    if (bettingClosed) {
      toast.error("Betting is closed for this round");
      return;
    }

    setIsPlacingBet(true);

    try {
      const { data, error } = await supabase.rpc('place_coinflip_bet', {
        p_choice: selectedSide,
        p_amount: amount
      });

      if (error) throw error;

      setHasBetThisRound(true);
      setCurrentBet({ choice: selectedSide, amount });
      toast.success(`Bet placed: ₹${amount} on ${selectedSide.toUpperCase()}`);
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `00:00:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnimationDismiss = () => {
    setShowAnimation(false);
    setFlipResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50" onClick={showAnimation && !isFlipping ? handleAnimationDismiss : undefined}>
      <Header />
      
      {/* Coin Flip Animation */}
      <CoinFlipAnimation 
        result={flipResult} 
        isFlipping={isFlipping} 
        onComplete={() => setIsFlipping(false)}
      />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="relative text-center mb-8 py-12 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-4">
                Our Special Game
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide mb-3" style={{ fontFamily: 'serif' }}>
                COIN FLIP
              </h1>
              <p className="text-blue-100 max-w-lg mx-auto">
                Experience the thrill of gaming with real stats and instant updates - your winning edge starts here!
              </p>
            </div>
            {/* Decorative coins */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-400 rounded-full opacity-80 blur-sm" />
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-400 rounded-full opacity-80 blur-sm" />
          </div>

          {/* Balance Display */}
          {user && profile && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-700">
                  ₹{Number(profile.wallet_balance).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bet Now Card */}
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-center text-blue-600 mb-4" style={{ fontFamily: 'serif', fontStyle: 'italic' }}>
                  BET NOW
                </h2>

                {/* Last Result Banner */}
                {lastResult && (
                  <div className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg mb-4 text-sm",
                    lastResult.won 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-600 border border-red-200"
                  )}>
                    {lastResult.won ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>
                      {lastResult.won 
                        ? `You Won ₹${lastResult.amount.toFixed(2)}!` 
                        : `You Lost ₹${lastResult.amount.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <p className="text-center text-gray-600 mb-4">
                  Minimum Bet Amount: <span className="text-blue-600 font-semibold">₹10.00</span>
                </p>

                {/* Countdown Timer */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg flex items-center gap-3 shadow-lg">
                      <Clock className="h-5 w-5" />
                      <span className="font-mono text-lg">Remaining Time: {formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                </div>

                {/* Bet Amount Input */}
                <div className="space-y-3 mb-6">
                  <label className="text-sm font-medium text-gray-700">Bet Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter Bet Amount"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                    className="text-center h-12 border-gray-300 bg-gray-50"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[60px] border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => setBetAmount(amount.toString())}
                        disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                      >
                        {amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Prediction Selection */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm font-medium text-gray-700">Prediction:</span>
                  <div className="flex gap-3">
                    <Button
                      variant={selectedSide === "heads" ? "default" : "outline"}
                      onClick={() => !hasBetThisRound && !bettingClosed && setSelectedSide("heads")}
                      disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                      className={cn(
                        "px-6",
                        selectedSide === "heads" 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : "border-blue-300 text-blue-600 hover:bg-blue-50"
                      )}
                    >
                      Head
                    </Button>
                    <Button
                      variant={selectedSide === "tails" ? "default" : "outline"}
                      onClick={() => !hasBetThisRound && !bettingClosed && setSelectedSide("tails")}
                      disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                      className={cn(
                        "px-6",
                        selectedSide === "tails" 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : "border-blue-300 text-blue-600 hover:bg-blue-50"
                      )}
                    >
                      Tail
                    </Button>
                  </div>
                </div>

                {/* Current Bet Display */}
                {hasBetThisRound && currentBet && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
                    <p className="text-blue-700 font-medium">
                      Your bet: ₹{currentBet.amount} on {currentBet.choice.toUpperCase()}
                    </p>
                    <p className="text-sm text-blue-600">Waiting for result...</p>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || hasBetThisRound || bettingClosed || !selectedSide}
                  className={cn(
                    "w-full h-12 text-lg font-semibold",
                    bettingClosed 
                      ? "bg-red-500 hover:bg-red-500 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isPlacingBet ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Placing Bet...
                    </span>
                  ) : bettingClosed ? (
                    "Betting Closed"
                  ) : hasBetThisRound ? (
                    "Bet Placed - Waiting..."
                  ) : (
                    "Place Bet"
                  )}
                </Button>

                {/* Login prompt */}
                {!user && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
                      {" "}or{" "}
                      <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
                      {" "}to play
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Side - Past Results & History */}
            <div className="space-y-6">
              {/* Past Results */}
              <Card className="bg-blue-50/50 shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-800">Past Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {pastResults.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      No results yet. Be the first to play!
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pastResults.map((result, index) => (
                        <div
                          key={result.id}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm",
                            result.result === "heads"
                              ? "bg-blue-600 text-white"
                              : "bg-orange-500 text-white"
                          )}
                          title={result.result === "heads" ? "Heads" : "Tails"}
                        >
                          {result.result === "heads" ? "H" : "T"}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Your Bet History */}
              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-800">Your Bet History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!user ? (
                    <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 text-center">
                      Please login to see your bet history
                    </div>
                  ) : userBetHistory.length === 0 ? (
                    <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 text-center">
                      You don't have any Bet History
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userBetHistory.map((bet) => (
                        <div
                          key={bet.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg text-sm",
                            bet.status === 'won' 
                              ? "bg-green-50 border border-green-200" 
                              : bet.status === 'lost'
                              ? "bg-red-50 border border-red-200"
                              : "bg-gray-50 border border-gray-200"
                          )}
                        >
                          <span className="font-medium">
                            Round #{(bet as any).coinflip_rounds?.round_number || '?'} - {bet.choice.toUpperCase()}
                          </span>
                          <span className={cn(
                            "font-bold",
                            bet.status === 'won' ? "text-green-600" : 
                            bet.status === 'lost' ? "text-red-600" : "text-gray-600"
                          )}>
                            {bet.status === 'won' ? `+₹${bet.payout}` : 
                             bet.status === 'lost' ? `-₹${bet.amount}` : 
                             `₹${bet.amount} (pending)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {user && (
                    <div className="mt-4 text-center">
                      <Link to="/history">
                        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                          <History className="h-4 w-4 mr-2" />
                          Coin Flip History
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoinFlip;
