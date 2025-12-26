import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Flame, Loader2, Info } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  team_a: string;
  team_b: string;
  team_a_logo: string | null;
  team_b_logo: string | null;
  status: "upcoming" | "live" | "completed" | "cancelled";
  league: string | null;
  closing_time: string | null;
  extra_time: string | null;
  odds_team_a: number;
  odds_team_b: number;
  start_time: string;
  max_bet: number | null;
}

const MatchCard = ({ match, index }: { match: Match; index: number }) => {
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: index * 0.1 },
    },
  };

  const closingTime = match.closing_time ? new Date(match.closing_time) : null;
  const extraTime = match.extra_time ? new Date(match.extra_time) : null;
  const startTime = new Date(match.start_time);
  const maxBet = match.max_bet ? Number(match.max_bet) : 100000;
  const winRatio = 98;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group"
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-xl transition-all duration-300">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary/80 to-primary px-4 py-2 text-center">
          <h3 className="font-display font-bold text-primary-foreground text-sm md:text-base truncate">
            {match.team_a} vs {match.team_b}
          </h3>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Teams Section */}
          <div className="flex items-center justify-between gap-2">
            {/* Team A */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                {match.team_a_logo ? (
                  <img 
                    src={match.team_a_logo} 
                    alt={match.team_a}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">🏏</span>
                )}
              </div>
              <p className="text-xs md:text-sm font-medium truncate">{match.team_a}</p>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground font-display text-lg md:text-xl font-bold">v/s</span>
            </div>

            {/* Team B */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                {match.team_b_logo ? (
                  <img 
                    src={match.team_b_logo} 
                    alt={match.team_b}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">🏏</span>
                )}
              </div>
              <p className="text-xs md:text-sm font-medium truncate">{match.team_b}</p>
            </div>
          </div>

          {/* Win Ratio Circle */}
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
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
                <span className="text-[8px] text-muted-foreground">Win Ratio</span>
                <span className="text-sm font-bold text-primary">{winRatio}%</span>
              </div>
            </div>
          </div>

          {/* Match Info */}
          <div className="space-y-1 text-center text-sm">
            <p>
              <span className="text-muted-foreground">Max Bet: </span>
              <span className="font-semibold text-primary">₹{maxBet.toLocaleString()}</span>
              <span className="text-muted-foreground mx-2">|</span>
              <span className="text-muted-foreground">{format(startTime, "dd MMM hh:mm a")}</span>
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            {match.status === "live" ? (
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase">Live Now</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                <span className="text-xs font-medium">Upcoming</span>
              </div>
            )}
          </div>

          {/* Closing & Extra Time */}
          <div className="space-y-1 text-center text-sm">
            {closingTime && (
              <p>
                <span className="font-medium text-muted-foreground">CLOSING TIME : </span>
                <span className="font-bold text-destructive">{format(closingTime, "hh:mm a")}</span>
              </p>
            )}
            {extraTime && (
              <p>
                <span className="font-medium text-muted-foreground">EXTRA TIME : </span>
                <span className="font-bold text-primary">{format(extraTime, "hh:mm a")}</span>
              </p>
            )}
          </div>

          {/* Bet Button */}
          <Link to="/matches" className="block">
            <Button
              variant="default"
              className="w-full bg-primary hover:bg-primary/90"
            >
              Bet Now
            </Button>
          </Link>
        </CardContent>

        {/* Info Icon */}
        <button className="absolute top-2 right-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <Info className="h-4 w-4" />
        </button>
      </Card>
    </motion.div>
  );
};

export const LiveMatchesPreview = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("id, team_a, team_b, team_a_logo, team_b_logo, status, league, closing_time, extra_time, odds_team_a, odds_team_b, start_time, max_bet")
      .in("status", ["live", "upcoming"])
      .order("status", { ascending: false })
      .order("start_time", { ascending: true })
      .limit(3);

    if (!error && data) {
      setMatches(data as Match[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const headerVariants: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } },
  };

  // Don't render section if no matches
  if (!loading && matches.length === 0) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* Floating accent orb */}
      <motion.div
        className="absolute top-1/2 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
              <Flame className="h-4 w-4 text-destructive" />
              <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Hot Matches</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-wide mb-2">
              Live <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Matches</span>
            </h2>
            <p className="text-muted-foreground text-lg">Place your bets on ongoing matches</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link to="/matches">
              <Button variant="outline" className="gap-2 group border-primary/30 hover:border-primary">
                View All Matches
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match, index) => (
              <MatchCard key={match.id} match={match} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
