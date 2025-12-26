import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Clock, Wallet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CoinFlipAnimation } from "@/components/coinflip/CoinFlipAnimation";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Confetti } from "@/components/ui/confetti";

interface Round {
  id: string;
  round_number: number;
  ends_at: string;
  result: string | null;
  is_settled: boolean;
}

interface Bet {
  choice: string;
  amount: number;
  status: string;
  payout: number;
}

const CoinFlip = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { playWinSound, playLoseSound, playBetPlacedSound } = useSoundEffects();
  
  const [selectedSide, setSelectedSide] = useState<"heads" | "tails" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  
  // Round state - single source of truth from server
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [currentBet, setCurrentBet] = useState<Bet | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(15);
  
  // Results
  const [pastResults, setPastResults] = useState<{ id: string; result: string; round_number: number }[]>([]);
  const [userBetHistory, setUserBetHistory] = useState<any[]>([]);
  
  // UI state
  const [showResult, setShowResult] = useState(false);
  const [lastRoundResult, setLastRoundResult] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [lastLossAmount, setLastLossAmount] = useState<number | null>(null);
  
  // Refs to prevent duplicate processing
  const processedRoundRef = useRef<string | null>(null);
  const settlingRef = useRef(false);

  const quickAmounts = [10, 50, 100, 500, 1000];

  // Fetch current round from server
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
            .select('choice, amount, status, payout')
            .eq('round_id', data.id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setCurrentBet(betData);
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
      setPastResults(data.map(r => ({ id: r.id, result: r.result!, round_number: r.round_number })));
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

  // Settle round - called once when round ends
  const settleRound = useCallback(async () => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    
    try {
      await supabase.functions.invoke('settle-coinflip');
    } catch (error) {
      console.error('Error settling round:', error);
    } finally {
      settlingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCurrentRound();
    fetchPastResults();
    fetchUserBetHistory();
  }, [fetchCurrentRound, fetchPastResults, fetchUserBetHistory]);

  // Timer - just updates display, doesn't trigger anything heavy
  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const now = Date.now();
      const endTime = new Date(currentRound.ends_at).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
      // When round ends, trigger settlement once
      if (remaining === 0 && processedRoundRef.current !== currentRound.id) {
        processedRoundRef.current = currentRound.id;
        settleRound();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRound, settleRound]);

  // Store refs for callbacks to avoid re-subscribing
  const currentRoundRef = useRef(currentRound);
  const currentBetRef = useRef(currentBet);
  const fetchCurrentRoundRef = useRef(fetchCurrentRound);
  const fetchPastResultsRef = useRef(fetchPastResults);
  const fetchUserBetHistoryRef = useRef(fetchUserBetHistory);
  const refreshProfileRef = useRef(refreshProfile);
  const playWinSoundRef = useRef(playWinSound);
  const playLoseSoundRef = useRef(playLoseSound);
  
  useEffect(() => {
    currentRoundRef.current = currentRound;
    currentBetRef.current = currentBet;
    fetchCurrentRoundRef.current = fetchCurrentRound;
    fetchPastResultsRef.current = fetchPastResults;
    fetchUserBetHistoryRef.current = fetchUserBetHistory;
    refreshProfileRef.current = refreshProfile;
    playWinSoundRef.current = playWinSound;
    playLoseSoundRef.current = playLoseSound;
  });

  // Realtime subscription - STABLE, subscribes once only
  useEffect(() => {
    const channel = supabase
      .channel('coinflip-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coinflip_rounds',
        },
        (payload) => {
          const updatedRound = payload.new as Round;
          
          // Round was just settled - show result to all users
          if (updatedRound.is_settled && updatedRound.result) {
            setLastRoundResult(updatedRound.result);
            setShowResult(true);
            
            // Check if current user won/lost using refs
            const bet = currentBetRef.current;
            const round = currentRoundRef.current;
            
            if (bet && round?.id === updatedRound.id) {
              const won = bet.choice === updatedRound.result;
              
              if (won) {
                playWinSoundRef.current();
                setShowConfetti(true);
                setLastWinAmount(bet.amount * 1.95);
                setLastLossAmount(null);
                setTimeout(() => setShowConfetti(false), 3000);
              } else {
                playLoseSoundRef.current();
                setLastLossAmount(bet.amount);
                setLastWinAmount(null);
              }
              
              refreshProfileRef.current();
            }
            
            // Refresh data after settlement
            fetchPastResultsRef.current();
            fetchUserBetHistoryRef.current();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coinflip_rounds',
        },
        () => {
          // New round created - refresh everything
          fetchCurrentRoundRef.current();
          setCurrentBet(null);
          setSelectedSide(null);
          setBetAmount("");
          processedRoundRef.current = null;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty deps - subscribes once only

  // Place bet
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

    if (timeRemaining <= 2) {
      toast.error("Betting is closed for this round");
      return;
    }

    setIsPlacingBet(true);

    try {
      const { error } = await supabase.rpc('place_coinflip_bet', {
        p_choice: selectedSide,
        p_amount: amount
      });

      if (error) throw error;

      setCurrentBet({ choice: selectedSide, amount, status: 'pending', payout: 0 });
      playBetPlacedSound();
      toast.success(`Bet placed: ₹${amount} on ${selectedSide.toUpperCase()}`);
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleDismissResult = () => {
    setShowResult(false);
    setLastRoundResult(null);
    fetchCurrentRound();
  };

  const formatTime = (seconds: number) => `00:${seconds.toString().padStart(2, '0')}`;
  const bettingClosed = timeRemaining <= 2;
  const hasBet = !!currentBet;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <CoinFlipAnimation 
        result={lastRoundResult as "heads" | "tails" | null} 
        isFlipping={showResult} 
        onDismiss={handleDismissResult}
      />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8 py-8 bg-primary rounded-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium mb-3">
              <Coins className="h-4 w-4" />
              Live Game
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              COIN FLIP
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              All players see the same result simultaneously
            </p>
          </div>

          {/* Balance */}
          {user && profile && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30">
                <Wallet className="h-4 w-4 text-success" />
                <span className="font-bold text-success">
                  ₹{Number(profile.wallet_balance).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bet Card */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-center text-primary mb-4">BET NOW</h2>

                {/* Win/Loss Banner */}
                {lastWinAmount && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg mb-4 bg-success/10 text-success border border-success/30">
                    <CheckCircle className="h-5 w-5" />
                    <span>🎉 You Won ₹{lastWinAmount.toFixed(2)}!</span>
                  </div>
                )}
                {lastLossAmount && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg mb-4 bg-destructive/10 text-destructive border border-destructive/30">
                    <AlertCircle className="h-5 w-5" />
                    <span>You Lost ₹{lastLossAmount.toFixed(2)}</span>
                  </div>
                )}

                <p className="text-center text-muted-foreground text-sm mb-4">
                  Minimum Bet: <span className="text-primary font-semibold">₹10</span>
                </p>

                {/* Round Info */}
                {currentRound && (
                  <div className="text-center mb-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Round #{currentRound.round_number}
                    </span>
                  </div>
                )}

                {/* Timer */}
                <div className="flex justify-center mb-6">
                  <div className={cn(
                    "px-6 py-3 rounded-lg flex items-center gap-2",
                    bettingClosed 
                      ? "bg-destructive text-destructive-foreground" 
                      : timeRemaining <= 5 
                        ? "bg-warning text-warning-foreground" 
                        : "bg-primary text-primary-foreground"
                  )}>
                    <Clock className="h-4 w-4" />
                    <span className="font-mono text-xl font-bold">{formatTime(timeRemaining)}</span>
                  </div>
                </div>

                {/* Bet Amount */}
                <div className="space-y-3 mb-6">
                  <label className="text-sm font-medium text-foreground">Bet Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlacingBet || hasBet || bettingClosed}
                    className="text-center h-11 bg-muted/50"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[60px]"
                        onClick={() => setBetAmount(amount.toString())}
                        disabled={isPlacingBet || hasBet || bettingClosed}
                      >
                        ₹{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Side Selection */}
                <div className="mb-6">
                  <span className="text-sm font-medium text-foreground mb-3 block">Choose Side:</span>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={selectedSide === "heads" ? "default" : "outline"}
                      onClick={() => !hasBet && !bettingClosed && setSelectedSide("heads")}
                      disabled={isPlacingBet || hasBet || bettingClosed}
                      className={cn(
                        "h-14 text-base font-bold",
                        selectedSide === "heads" && "bg-warning text-warning-foreground hover:bg-warning/90"
                      )}
                    >
                      🪙 HEADS
                    </Button>
                    <Button
                      variant={selectedSide === "tails" ? "default" : "outline"}
                      onClick={() => !hasBet && !bettingClosed && setSelectedSide("tails")}
                      disabled={isPlacingBet || hasBet || bettingClosed}
                      className={cn(
                        "h-14 text-base font-bold",
                        selectedSide === "tails" && "bg-blue-500 text-white hover:bg-blue-600"
                      )}
                    >
                      🪙 TAILS
                    </Button>
                  </div>
                </div>

                {/* Potential Win */}
                {betAmount && parseFloat(betAmount) >= 10 && (
                  <div className="text-center py-3 bg-success/10 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">Potential Win</p>
                    <p className="text-xl font-bold text-success">
                      ₹{(parseFloat(betAmount) * 1.95).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Current Bet */}
                {hasBet && (
                  <div className="text-center py-3 bg-primary/10 rounded-lg mb-4 border border-primary/30">
                    <p className="text-sm text-muted-foreground">Your Bet</p>
                    <p className="text-lg font-bold text-primary">
                      ₹{currentBet.amount} on {currentBet.choice.toUpperCase()}
                    </p>
                  </div>
                )}

                {/* Place Bet Button */}
                <Button
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || hasBet || bettingClosed || !selectedSide || !betAmount}
                  className="w-full h-12 text-lg font-bold"
                  size="lg"
                >
                  {isPlacingBet ? "Placing..." : hasBet ? "Bet Placed" : bettingClosed ? "Betting Closed" : "Place Bet"}
                </Button>
              </CardContent>
            </Card>

            {/* Results Column */}
            <div className="space-y-6">
              {/* Past Results */}
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-primary mb-4">Past Results</h3>
                  {pastResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No results yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pastResults.map((r) => (
                        <div
                          key={r.id}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                            r.result === "heads"
                              ? "bg-warning/20 text-warning border border-warning/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          )}
                          title={`Round #${r.round_number}`}
                        >
                          {r.result === "heads" ? "H" : "T"}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Bet History */}
              {user && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Your History</h3>
                    {userBetHistory.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No bets yet</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userBetHistory.map((bet) => (
                          <div
                            key={bet.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg text-sm",
                              bet.status === "won" ? "bg-success/10" : bet.status === "lost" ? "bg-destructive/10" : "bg-muted/50"
                            )}
                          >
                            <div>
                              <span className="font-medium">#{bet.coinflip_rounds?.round_number}</span>
                              <span className="ml-2 text-muted-foreground">{bet.choice.toUpperCase()}</span>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "font-bold",
                                bet.status === "won" ? "text-success" : bet.status === "lost" ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {bet.status === "won" ? `+₹${bet.payout}` : bet.status === "lost" ? `-₹${bet.amount}` : "Pending"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoinFlip;
