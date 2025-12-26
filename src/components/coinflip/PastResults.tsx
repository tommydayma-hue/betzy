import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface CoinFlipResult {
  id: string;
  result: "H" | "T";
  created_at: string;
}

export const PastResults = () => {
  const [results, setResults] = useState<CoinFlipResult[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { playNotificationSound } = useSoundEffects();
  const isInitialLoad = useRef(true);

  const fetchResults = async () => {
    setIsRefreshing(true);
    
    // Fetch recent coin flip transactions (both wins and losses)
    const { data, error } = await supabase
      .from("transactions")
      .select("id, description, created_at")
      .or("description.ilike.%Coin flip win%,description.ilike.%Coin flip loss%")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      const parsedResults: CoinFlipResult[] = data.map((tx) => {
        // Parse result from description
        // Win: "Coin flip win - chose heads/tails" means the result was what they chose
        // Loss: "Coin flip loss - chose heads/tails" means the result was opposite
        const isWin = tx.description?.includes("win");
        const choseHeads = tx.description?.includes("heads");
        
        let result: "H" | "T";
        if (isWin) {
          result = choseHeads ? "H" : "T";
        } else {
          result = choseHeads ? "T" : "H";
        }

        return {
          id: tx.id,
          result,
          created_at: tx.created_at,
        };
      });

      setResults(parsedResults);
    }
    
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchResults().then(() => {
      isInitialLoad.current = false;
    });

    // Subscribe to realtime updates for new transactions
    const channel = supabase
      .channel('coinflip-results')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const desc = payload.new.description as string;
          // Only update if it's a coin flip transaction
          if (desc?.includes('Coin flip')) {
            console.log('New coin flip result:', payload.new);
            // Play sound only for realtime updates, not initial load
            if (!isInitialLoad.current) {
              playNotificationSound();
            }
            fetchResults();
          }
        }
      )
      .subscribe();

    // Fallback: Auto-refresh every 30 seconds if no realtime activity
    const interval = setInterval(() => {
      fetchResults();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).replace(",", " @");
  };

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-display">
            <History className="h-5 w-5 text-primary" />
            Past Results
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {formatTime(lastUpdated)}
            </span>
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
            >
              <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "text-primary")} />
            </motion.div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No coin flip results yet. Be the first to play!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg font-display font-bold text-sm transition-all",
                  result.result === "H"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-secondary text-secondary-foreground border border-border"
                )}
                title={`Result: ${result.result === "H" ? "Heads" : "Tails"}`}
              >
                {result.result}
              </motion.div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Live updates + auto-refresh every 30s
        </p>
      </CardContent>
    </Card>
  );
};
