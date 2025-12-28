import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ArrowRight, Sparkles } from "lucide-react";

export const CoinFlipPreview = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <Card variant="neon" className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Content */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/20 text-[hsl(32,95%,22%)] text-sm font-medium mb-6 w-fit">
                  <Sparkles className="h-4 w-4" />
                  Instant Challenge
                </div>
                
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-wide mb-4">
                  Coin <span className="text-glow">Flip</span>
                </h2>
                
                <p className="text-muted-foreground text-lg mb-8">
                  Choose Heads or Tails, place your bet, and win instantly! 
                  Double your money with a 50/50 chance.
                </p>

                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-success">2x</p>
                    <p className="text-sm text-muted-foreground">Payout</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-primary">₹10</p>
                    <p className="text-sm text-muted-foreground">Min Bet</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-warning">Instant</p>
                    <p className="text-sm text-muted-foreground">Results</p>
                  </div>
                </div>

                <Link to="/coinflip">
                  <Button variant="neon" size="lg" className="gap-2 w-full sm:w-auto">
                    Play Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Right Visual */}
              <div className="relative flex items-center justify-center p-8 md:p-12 bg-gradient-to-br from-primary/10 to-transparent">
                {/* Animated Coin */}
                <div className="relative">
                  {/* Glow Ring */}
                  <div className="absolute inset-0 w-48 h-48 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  
                  {/* Coin */}
                  <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-warning via-warning/80 to-warning/60 flex items-center justify-center shadow-2xl animate-float border-4 border-warning/30">
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-warning/40 to-transparent" />
                    <Coins className="h-20 w-20 text-background/80" />
                  </div>

                  {/* Floating Particles */}
                  <div className="absolute -top-4 -right-4 w-3 h-3 rounded-full bg-primary animate-float" style={{ animationDelay: "0.5s" }} />
                  <div className="absolute -bottom-2 -left-6 w-2 h-2 rounded-full bg-success animate-float" style={{ animationDelay: "1s" }} />
                  <div className="absolute top-1/2 -right-8 w-4 h-4 rounded-full bg-warning/60 animate-float" style={{ animationDelay: "1.5s" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
