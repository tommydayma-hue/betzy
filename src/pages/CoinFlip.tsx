import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Clock, History, Loader2, Wallet, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { CoinFlipAnimation } from "@/components/coinflip/CoinFlipAnimation";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Confetti } from "@/components/ui/confetti";

const CoinFlip = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { playWinSound, playLoseSound, playBetPlacedSound } = useSoundEffects();
  
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
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Refs to prevent multiple settle calls
  const settleInProgressRef = useRef(false);
  const lastRoundIdRef = useRef<string | null>(null);

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
            .maybeSingle();
          
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

  // Settle round via edge function - with debouncing
  const settleRound = useCallback(async (roundId: string) => {
    // Prevent multiple simultaneous calls
    if (settleInProgressRef.current) {
      return null;
    }
    
    // Prevent settling same round twice
    if (lastRoundIdRef.current === roundId) {
      return null;
    }
    
    settleInProgressRef.current = true;
    lastRoundIdRef.current = roundId;
    
    try {
      const { data, error } = await supabase.functions.invoke('settle-coinflip');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error settling round:', error);
      return null;
    } finally {
      settleInProgressRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCurrentRound();
    fetchPastResults();
    fetchUserBetHistory();
  }, [fetchCurrentRound, fetchPastResults, fetchUserBetHistory]);

  // Countdown timer - runs at 1 second intervals, not 100ms
  useEffect(() => {
    if (!currentRound) return;

    let animationTriggered = false;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(currentRound.ends_at).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeRemaining(remaining);
      setBettingClosed(remaining <= 2);

      // When round ends, settle and show animation
      if (remaining === 0 && !animationTriggered && !isFlipping) {
        animationTriggered = true;
        handleRoundEnd();
      }
    };

    const handleRoundEnd = async () => {
      if (!currentRound) return;
      
      // Start flip animation immediately
      setIsFlipping(true);
      
      // Settle the round
      await settleRound(currentRound.id);
      
      // Wait a moment for DB to update, then get result
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
          .maybeSingle();
        
        if (data) {
          const won = data.status === 'won';
          setLastResult({
            result: (data as any).coinflip_rounds?.result || '',
            won,
            amount: won ? data.payout || 0 : data.amount
          });
          
          // Play sounds and show confetti
          if (won) {
            playWinSound();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          } else {
            playLoseSound();
          }
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // 1 second intervals

    return () => clearInterval(interval);
  }, [currentRound, currentBet, user, settleRound, isFlipping, playWinSound, playLoseSound]);

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
        () => {
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
      playBetPlacedSound();
      toast.success(`Bet placed: ₹${amount} on ${selectedSide.toUpperCase()}`);
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const formatTime = (seconds: number) => {
    return `00:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAnimationComplete = () => {
    // Animation finished flipping, result is now showing
  };

  const handleAnimationDismiss = async () => {
    setFlipResult(null);
    setIsFlipping(false);
    
    // Reset bet state for next round
    setHasBetThisRound(false);
    setCurrentBet(null);
    setSelectedSide(null);
    setBetAmount("");
    
    // Reset settle ref so new round can be settled
    lastRoundIdRef.current = null;
    
    // Fetch fresh data
    await fetchCurrentRound();
    await fetchPastResults();
    await fetchUserBetHistory();
    await refreshProfile();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-secondary/20">
      <Header />
      
      {/* Confetti */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* Coin Flip Animation */}
      <CoinFlipAnimation 
        result={flipResult} 
        isFlipping={isFlipping} 
        onComplete={handleAnimationComplete}
        onDismiss={handleAnimationDismiss}
      />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="relative text-center mb-8 py-12 bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 text-primary-foreground text-sm font-medium mb-4 backdrop-blur-sm">
                <Coins className="h-4 w-4" />
                Our Special Game
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-wide mb-3 font-display">
                COIN FLIP
              </h1>
              <p className="text-primary-foreground/80 max-w-lg mx-auto">
                Experience the thrill of gaming with real stats and instant updates - your winning edge starts here!
              </p>
            </div>
            {/* Decorative coins */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 bg-warning rounded-full opacity-60 blur-md hidden md:block" />
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 bg-warning rounded-full opacity-60 blur-md hidden md:block" />
          </div>

          {/* Balance Display */}
          {user && profile && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-success/10 border border-success/30 shadow-sm">
                <Wallet className="h-4 w-4 text-success" />
                <span className="font-bold text-success">
                  ₹{Number(profile.wallet_balance).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bet Now Card */}
            <Card className="bg-card shadow-xl border-border/50">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-center text-primary mb-4 font-display">
                  BET NOW
                </h2>

                {/* Last Result Banner */}
                {lastResult && (
                  <div className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm font-medium transition-all",
                    lastResult.won 
                      ? "bg-success/10 text-success border border-success/30" 
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                  )}>
                    {lastResult.won ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="text-base">
                      {lastResult.won 
                        ? `🎉 You Won ₹${lastResult.amount.toFixed(2)}!` 
                        : `You Lost ₹${lastResult.amount.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <p className="text-center text-muted-foreground mb-4">
                  Minimum Bet Amount: <span className="text-primary font-semibold">₹10.00</span>
                </p>

                {/* Round Info */}
                {currentRound && (
                  <div className="text-center mb-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Round #{currentRound.round_number}
                    </span>
                  </div>
                )}

                {/* Countdown Timer */}
                <div className="flex justify-center mb-6">
                  <div className={cn(
                    "px-8 py-4 rounded-xl flex items-center gap-3 shadow-lg transition-all",
                    bettingClosed 
                      ? "bg-destructive text-destructive-foreground" 
                      : timeRemaining <= 5 
                        ? "bg-warning text-warning-foreground animate-pulse" 
                        : "bg-primary text-primary-foreground"
                  )}>
                    <Clock className="h-5 w-5" />
                    <span className="font-mono text-2xl font-bold tracking-wider">
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>

                {/* Bet Amount Input */}
                <div className="space-y-3 mb-6">
                  <label className="text-sm font-medium text-foreground">Bet Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter Bet Amount"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                    className="text-center h-12 bg-muted/50 border-border text-lg"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[60px] border-border hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
                        onClick={() => setBetAmount(amount.toString())}
                        disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                      >
                        ₹{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Prediction Selection */}
                <div className="mb-6">
                  <span className="text-sm font-medium text-foreground mb-3 block">Choose Your Side:</span>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={selectedSide === "heads" ? "default" : "outline"}
                      onClick={() => !hasBetThisRound && !bettingClosed && setSelectedSide("heads")}
                      disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                      className={cn(
                        "h-16 text-lg font-bold transition-all",
                        selectedSide === "heads" 
                          ? "bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg scale-105" 
                          : "border-2 border-warning/50 text-warning hover:bg-warning/10"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-2xl">🪙</span>
                        <span>HEADS</span>
                      </div>
                    </Button>
                    <Button
                      variant={selectedSide === "tails" ? "default" : "outline"}
                      onClick={() => !hasBetThisRound && !bettingClosed && setSelectedSide("tails")}
                      disabled={isPlacingBet || hasBetThisRound || bettingClosed}
                      className={cn(
                        "h-16 text-lg font-bold transition-all",
                        selectedSide === "tails" 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg scale-105" 
                          : "border-2 border-primary/50 text-primary hover:bg-primary/10"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-2xl">🔵</span>
                        <span>TAILS</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Potential Win Display */}
                {betAmount && parseFloat(betAmount) >= 10 && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-success">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Potential Win:</span>
                      <span className="font-bold text-lg">₹{(parseFloat(betAmount) * 1.95).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Current Bet Display */}
                {hasBetThisRound && currentBet && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4 text-center">
                    <p className="text-primary font-medium text-lg">
                      Your bet: ₹{currentBet.amount} on {currentBet.choice.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Waiting for result...
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || hasBetThisRound || bettingClosed || !selectedSide || !betAmount}
                  className={cn(
                    "w-full h-14 text-lg font-bold transition-all",
                    bettingClosed 
                      ? "bg-destructive hover:bg-destructive cursor-not-allowed" 
                      : hasBetThisRound
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl"
                  )}
                >
                  {isPlacingBet ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Placing Bet...
                    </span>
                  ) : bettingClosed ? (
                    "⏰ Betting Closed"
                  ) : hasBetThisRound ? (
                    "✓ Bet Placed"
                  ) : (
                    "Place Bet"
                  )}
                </Button>

                {/* Login prompt */}
                {!user && (
                  <div className="mt-4 text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
                      {" "}or{" "}
                      <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
                      {" "}to play
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Side - Past Results & History */}
            <div className="space-y-6">
              {/* Past Results */}
              <Card className="bg-card/80 shadow-lg border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Past Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pastResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No results yet. Be the first to play!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pastResults.map((result, index) => (
                        <div
                          key={result.id}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-110",
                            result.result === "heads"
                              ? "bg-warning text-warning-foreground"
                              : "bg-primary text-primary-foreground"
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
              <Card className="bg-card shadow-lg border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Your Bet History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!user ? (
                    <div className="bg-muted/50 text-muted-foreground rounded-lg p-6 text-center">
                      <p>Please login to see your bet history</p>
                    </div>
                  ) : userBetHistory.length === 0 ? (
                    <div className="bg-muted/50 text-muted-foreground rounded-lg p-6 text-center">
                      <p>You don't have any Bet History yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {userBetHistory.map((bet) => (
                        <div
                          key={bet.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg text-sm transition-all",
                            bet.status === 'won' 
                              ? "bg-success/10 border border-success/30" 
                              : bet.status === 'lost'
                              ? "bg-destructive/10 border border-destructive/30"
                              : "bg-muted/50 border border-border"
                          )}
                        >
                          <span className="font-medium text-foreground">
                            Round #{(bet as any).coinflip_rounds?.round_number || '?'} - {bet.choice.toUpperCase()}
                          </span>
                          <span className={cn(
                            "font-bold",
                            bet.status === 'won' ? "text-success" : 
                            bet.status === 'lost' ? "text-destructive" : "text-muted-foreground"
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
                        <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                          <History className="h-4 w-4 mr-2" />
                          View Full History
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
