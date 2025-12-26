import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Flame, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { CountdownTimer } from "@/components/matches/CountdownTimer";
import { Confetti } from "@/components/ui/confetti";

type Match = Tables<"matches">;

const TossMatchCard = ({ 
  match, 
  onPlaceBet,
  userBet,
  onCancelBet,
  isCancelling,
  onShowInfo
}: { 
  match: Match; 
  onPlaceBet: (match: Match) => void;
  userBet: any | null;
  onCancelBet: (betId: string) => void;
  isCancelling: boolean;
  onShowInfo: (match: Match) => void;
}) => {
  const closingTime = match.closing_time ? new Date(match.closing_time) : null;
  const extraTime = match.extra_time ? new Date(match.extra_time) : null;
  const startTime = new Date(match.start_time);
  const maxBet = match.max_bet ? Number(match.max_bet) : 100000;
  const isCompleted = match.status === 'completed';
  const tossWinnerName = match.toss_winner === 'team_a' ? match.team_a : match.toss_winner === 'team_b' ? match.team_b : null;
  
  // Win ratio display (for visual purposes)
  const winRatio = 98;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-xl transition-all duration-300",
        userBet && "ring-2 ring-primary/50"
      )}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary/80 to-primary px-4 py-2 flex items-center justify-between">
        <h3 className="font-display font-bold text-primary-foreground text-sm md:text-base truncate flex-1 text-center">
          {match.team_a} vs {match.team_b}
        </h3>
        {/* Info Button */}
        <button 
          className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          onClick={() => onShowInfo(match)}
        >
          <Info className="h-4 w-4 text-white" />
        </button>
      </div>

      <CardContent className="p-3 md:p-4 space-y-3">
        {/* Teams Section */}
        <div className="flex items-center justify-between gap-2">
          {/* Team A */}
          <div className="flex-1 text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-1.5 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center border border-border/30">
              {match.team_a_logo ? (
                <img 
                  src={match.team_a_logo} 
                  alt={match.team_a}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl md:text-3xl">🏏</span>
              )}
            </div>
            <p className="text-xs md:text-sm font-medium truncate px-1">{match.team_a}</p>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center">
            <span className="text-muted-foreground font-display text-base md:text-lg font-bold">v/s</span>
          </div>

          {/* Team B */}
          <div className="flex-1 text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-1.5 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center border border-border/30">
              {match.team_b_logo ? (
                <img 
                  src={match.team_b_logo} 
                  alt={match.team_b}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl md:text-3xl">🏏</span>
              )}
            </div>
            <p className="text-xs md:text-sm font-medium truncate px-1">{match.team_b}</p>
          </div>
        </div>

        {/* Win Ratio Circle */}
        <div className="flex justify-center">
          <div className="relative w-14 h-14 md:w-16 md:h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray={`${winRatio} ${100 - winRatio}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[7px] md:text-[8px] text-muted-foreground">Win Ratio</span>
              <span className="text-xs md:text-sm font-bold text-primary">{winRatio}%</span>
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="text-center text-xs md:text-sm">
          <p className="flex items-center justify-center gap-1 flex-wrap">
            <span className="text-muted-foreground">Max Bet:</span>
            <span className="font-semibold text-primary">₹{maxBet.toLocaleString()}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{format(startTime, "dd MMM hh:mm a")}</span>
          </p>
        </div>

        {/* Countdown Timer */}
        {closingTime && (
          <CountdownTimer 
            targetTime={closingTime} 
            label="CLOSES IN" 
            className="py-1.5 px-2 rounded-lg bg-destructive/10 text-xs md:text-sm"
          />
        )}

        {/* Closing & Extra Time - Compact */}
        <div className="flex justify-center gap-3 text-xs md:text-sm">
          {closingTime && (
            <p className="flex items-center gap-1">
              <span className="text-muted-foreground">Close:</span>
              <span className="font-semibold text-destructive">{format(closingTime, "hh:mm a")}</span>
            </p>
          )}
          {extraTime && (
            <p className="flex items-center gap-1">
              <span className="text-muted-foreground">Extra:</span>
              <span className="font-semibold text-primary">{format(extraTime, "hh:mm a")}</span>
            </p>
          )}
        </div>

        {/* User's bet info */}
        {userBet && (
          <div className="p-3 rounded-lg bg-primary/10 space-y-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Your Bet</p>
              <p className="font-semibold text-sm">
                {userBet.bet_type === 'team_a' ? match.team_a : match.team_b} - ₹{Number(userBet.amount).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: <span className={cn(
                  "font-medium",
                  userBet.status === 'won' && "text-success",
                  userBet.status === 'lost' && "text-destructive",
                  userBet.status === 'pending' && "text-primary",
                  userBet.status === 'cancelled' && "text-muted-foreground"
                )}>{userBet.status}</span>
              </p>
            </div>
            {userBet.status === 'pending' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onCancelBet(userBet.id)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Cancel Bet
              </Button>
            )}
          </div>
        )}

        {/* Bet Button or Completed Status */}
        {isCompleted ? (
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Toss Winner</p>
            <p className="font-semibold text-sm text-primary">{tossWinnerName || "Not announced"}</p>
          </div>
        ) : (
          <Button 
            variant="default"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!!userBet}
            onClick={() => onPlaceBet(match)}
          >
            {userBet ? "Already Bet" : "Bet Now"}
          </Button>
        )}
      </CardContent>

    </Card>
  );
};

const Matches = () => {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { playWinSound, playLoseSound, playBetPlacedSound } = useSoundEffects();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [infoMatch, setInfoMatch] = useState<Match | null>(null);
  const [betType, setBetType] = useState<"team_a" | "team_b" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCancellingBet, setIsCancellingBet] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "closed">("live");

  // Fetch live matches
  const { data: liveMatches = [], isLoading: loadingLive } = useQuery({
    queryKey: ["live-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "live")
        .eq("sport", "cricket")
        .order("start_time", { ascending: true });
      
      if (error) throw error;
      return data as Match[];
    },
  });

  // Fetch closed/completed matches
  const { data: closedMatches = [], isLoading: loadingClosed } = useQuery({
    queryKey: ["closed-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "completed")
        .eq("sport", "cricket")
        .order("start_time", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Match[];
    },
  });

  const matches = activeTab === "live" ? liveMatches : closedMatches;
  const isLoading = activeTab === "live" ? loadingLive : loadingClosed;

  // Fetch user's bets
  const { data: userBets = [] } = useQuery({
    queryKey: ["user-bets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to matches changes
    const matchesChannel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          console.log('Match update:', payload);
          queryClient.invalidateQueries({ queryKey: ['live-matches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, [queryClient]);

  // Subscribe to user's bets changes
  useEffect(() => {
    if (!user?.id) return;

    const betsChannel = supabase
      .channel('bets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Bet update:', payload);
          queryClient.invalidateQueries({ queryKey: ['user-bets', user.id] });
          
          // If bet was won, show toast, play sound, confetti and refresh balance
          if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'won') {
            playWinSound();
            setShowConfetti(true);
            toast.success('🎉 Congratulations! You won your bet!');
            refreshProfile();
          } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'lost') {
            playLoseSound();
            toast.info('Your bet was lost. Better luck next time!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(betsChannel);
    };
  }, [user?.id, queryClient, refreshProfile, playWinSound, playLoseSound]);

  const getUserBetForMatch = (matchId: string) => {
    // Only return active bets (not cancelled) so user can bet again after cancelling
    return userBets.find(bet => bet.match_id === matchId && bet.status !== 'cancelled');
  };

  const handlePlaceBet = (match: Match) => {
    if (!user) {
      toast.error("Please login to place bets");
      return;
    }
    setSelectedMatch(match);
    setBetType(null);
    setBetAmount("");
  };

  const submitBet = async () => {
    if (!selectedMatch || !betType || !betAmount) {
      toast.error("Please select a team and enter an amount");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const maxBet = selectedMatch.max_bet ? Number(selectedMatch.max_bet) : 100000;
    if (amount > maxBet) {
      toast.error(`Maximum bet is ₹${maxBet.toLocaleString()}`);
      return;
    }

    if (profile && amount > Number(profile.wallet_balance)) {
      toast.error("Insufficient balance");
      return;
    }

    setIsPlacingBet(true);
    try {
      const { data, error } = await supabase.rpc("place_bet", {
        p_match_id: selectedMatch.id,
        p_bet_type: betType,
        p_amount: amount,
      });

      if (error) throw error;

      playBetPlacedSound();
      toast.success("Bet placed successfully! Good luck!");
      setSelectedMatch(null);
      queryClient.invalidateQueries({ queryKey: ['live-matches'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const cancelBet = async (betId: string) => {
    if (!confirm("Are you sure you want to cancel this bet? The amount will be refunded.")) return;
    
    setIsCancellingBet(true);
    try {
      const { error } = await supabase.rpc("cancel_bet", {
        p_bet_id: betId,
      });

      if (error) throw error;

      toast.success("Bet cancelled! Amount refunded to your wallet.");
      queryClient.invalidateQueries({ queryKey: ['user-bets', user?.id] });
      refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel bet");
    } finally {
      setIsCancellingBet(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-12 px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <Header />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 animate-fade-in text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-destructive/30 bg-destructive/5 mb-4">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">Live Bet</span>
            </div>
            <h1 className="font-display text-xl md:text-3xl font-bold tracking-wide mb-2 italic">
              Real-Time Betting Experience
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Join the action with live odds and real-time updates. Stay ahead with instant insights for smart betting.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setActiveTab("live")}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "live" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                LIVE BETS
              </button>
              <button
                onClick={() => setActiveTab("closed")}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium transition-colors border-l border-border",
                  activeTab === "closed" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                CLOSE BETS LIST
              </button>
            </div>
          </div>

          {/* Balance Display */}
          {profile && (
            <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground text-sm">Your Balance:</span>
                <span className="font-display font-bold text-lg text-primary">
                  ₹{Number(profile.wallet_balance).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Matches Grid */}
          {matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {matches.map((match, index) => (
                <div 
                  key={match.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <TossMatchCard 
                    match={match} 
                    onPlaceBet={handlePlaceBet}
                    userBet={getUserBetForMatch(match.id)}
                    onCancelBet={cancelBet}
                    isCancelling={isCancellingBet}
                    onShowInfo={setInfoMatch}
                  />
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="p-12 text-center animate-fade-in">
              <Flame className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-display text-xl font-bold mb-2">
                {activeTab === "live" ? "No Live Matches" : "No Closed Matches"}
              </h3>
              <p className="text-muted-foreground">
                {activeTab === "live" 
                  ? "Check back soon for exciting toss betting opportunities!" 
                  : "No completed matches yet."}
              </p>
            </Card>
          )}
        </div>
      </main>

      {/* Betting Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Place Your Toss Bet</DialogTitle>
            <DialogDescription>
              {selectedMatch?.team_a} vs {selectedMatch?.team_b}
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-4">
              {/* Team Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                    betType === "team_a" 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setBetType("team_a")}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center mb-2">
                    {selectedMatch.team_a_logo ? (
                      <img src={selectedMatch.team_a_logo} alt={selectedMatch.team_a} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🏏</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate w-full text-center">{selectedMatch.team_a}</span>
                </button>
                <button
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                    betType === "team_b" 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setBetType("team_b")}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center mb-2">
                    {selectedMatch.team_b_logo ? (
                      <img src={selectedMatch.team_b_logo} alt={selectedMatch.team_b} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🏏</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate w-full text-center">{selectedMatch.team_b}</span>
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bet Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="1"
                  max={selectedMatch.max_bet ? Number(selectedMatch.max_bet) : 100000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {profile && (
                    <span>Balance: ₹{Number(profile.wallet_balance).toLocaleString()}</span>
                  )}
                  <span>Max: ₹{(selectedMatch.max_bet ? Number(selectedMatch.max_bet) : 100000).toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 flex-wrap">
                {[100, 500, 1000, 5000].map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(amount.toString())}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>

              {/* Potential Winnings */}
              {betAmount && betType && (
                <div className="p-4 bg-primary/10 rounded-xl text-center">
                  <p className="text-sm text-muted-foreground mb-1">Potential Winnings (2x)</p>
                  <p className="text-2xl font-display font-bold text-primary">
                    ₹{(parseFloat(betAmount) * 2).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              Cancel
            </Button>
            <Button 
              onClick={submitBet} 
              disabled={!betType || !betAmount || isPlacingBet}
            >
              {isPlacingBet ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Placing...
                </>
              ) : (
                "Confirm Bet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Info Dialog */}
      <Dialog open={!!infoMatch} onOpenChange={() => setInfoMatch(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="pr-8">
            <DialogTitle className="font-display text-base">Match Information</DialogTitle>
            <DialogDescription className="text-xs">
              {infoMatch?.team_a} vs {infoMatch?.team_b}
            </DialogDescription>
          </DialogHeader>

          {infoMatch && (
            <div className="space-y-3">
              {/* Custom Info Image */}
              {infoMatch.info_image && (
                <div className="rounded-lg overflow-hidden max-h-40">
                  <img 
                    src={infoMatch.info_image} 
                    alt="Match Info" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Custom Info Text Lines */}
              {(infoMatch.info_text_1 || infoMatch.info_text_2) && (
                <div className="space-y-1 p-3 bg-primary/10 rounded-lg">
                  {infoMatch.info_text_1 && (
                    <p className="text-xs md:text-sm font-medium text-center">{infoMatch.info_text_1}</p>
                  )}
                  {infoMatch.info_text_2 && (
                    <p className="text-xs text-muted-foreground text-center">{infoMatch.info_text_2}</p>
                  )}
                </div>
              )}

              {/* Teams - Compact */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 mx-auto mb-1 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center border border-border/30">
                    {infoMatch.team_a_logo ? (
                      <img src={infoMatch.team_a_logo} alt={infoMatch.team_a} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🏏</span>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{infoMatch.team_a}</p>
                </div>
                <span className="text-muted-foreground font-display text-sm font-bold">v/s</span>
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 mx-auto mb-1 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center border border-border/30">
                    {infoMatch.team_b_logo ? (
                      <img src={infoMatch.team_b_logo} alt={infoMatch.team_b} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🏏</span>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{infoMatch.team_b}</p>
                </div>
              </div>

              {/* Match Details - Compact */}
              <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg text-xs">
                {infoMatch.league && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">League</span>
                    <span className="font-medium">{infoMatch.league}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Time</span>
                  <span className="font-medium">{format(new Date(infoMatch.start_time), "dd MMM, hh:mm a")}</span>
                </div>
                {infoMatch.closing_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Betting Closes</span>
                    <span className="font-medium text-destructive">{format(new Date(infoMatch.closing_time), "hh:mm a")}</span>
                  </div>
                )}
                {infoMatch.extra_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extra Time</span>
                    <span className="font-medium text-primary">{format(new Date(infoMatch.extra_time), "hh:mm a")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Bet</span>
                  <span className="font-medium text-primary">₹{(infoMatch.max_bet ? Number(infoMatch.max_bet) : 100000).toLocaleString()}</span>
                </div>
              </div>

              {/* Betting Info - Compact */}
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Win Multiplier</p>
                <p className="text-xl font-display font-bold text-primary">2x</p>
                <p className="text-[10px] text-muted-foreground">Bet on the team that wins the toss</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setInfoMatch(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Matches;