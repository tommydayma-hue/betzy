import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, TrendingUp, TrendingDown, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const BettingHistory = () => {
  const { user } = useAuth();

  // Fetch all user bets with match info
  const { data: bets = [], isLoading } = useQuery({
    queryKey: ["betting-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bets")
        .select(`
          *,
          matches (
            team_a,
            team_b,
            team_a_logo,
            team_b_logo,
            toss_winner,
            start_time
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate statistics
  const stats = {
    totalBets: bets.length,
    wins: bets.filter((b) => b.status === "won").length,
    losses: bets.filter((b) => b.status === "lost").length,
    pending: bets.filter((b) => b.status === "pending").length,
    totalWagered: bets.reduce((sum, b) => sum + Number(b.amount), 0),
    totalWon: bets
      .filter((b) => b.status === "won")
      .reduce((sum, b) => sum + Number(b.potential_winnings), 0),
    totalLost: bets
      .filter((b) => b.status === "lost")
      .reduce((sum, b) => sum + Number(b.amount), 0),
  };

  const winRate = stats.totalBets > 0 ? ((stats.wins / (stats.wins + stats.losses)) * 100) || 0 : 0;
  const netProfit = stats.totalWon - stats.totalLost;

  // Chart data
  const pieData = [
    { name: "Won", value: stats.wins, color: "hsl(142, 76%, 36%)" },
    { name: "Lost", value: stats.losses, color: "hsl(0, 84%, 60%)" },
    { name: "Pending", value: stats.pending, color: "hsl(var(--primary))" },
  ].filter((d) => d.value > 0);

  // Monthly betting data (last 6 months)
  const getMonthlyData = () => {
    const months: { [key: string]: { won: number; lost: number; month: string } } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "yyyy-MM");
      months[key] = { won: 0, lost: 0, month: format(d, "MMM") };
    }

    bets.forEach((bet) => {
      const key = format(new Date(bet.created_at), "yyyy-MM");
      if (months[key]) {
        if (bet.status === "won") months[key].won += Number(bet.potential_winnings);
        if (bet.status === "lost") months[key].lost += Number(bet.amount);
      }
    });

    return Object.values(months);
  };

  const barData = getMonthlyData();

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
      <Header />

      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 animate-fade-in text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">BETTING HISTORY</span>
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-wide mb-2">
              Your <span className="text-glow">Performance</span>
            </h1>
            <p className="text-muted-foreground">Track your betting history and statistics</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Card className="bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-4 text-center">
                <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.totalBets}</p>
                <p className="text-xs text-muted-foreground">Total Bets</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold text-green-500">{stats.wins}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold text-red-500">{stats.losses}</p>
                <p className="text-xs text-muted-foreground">Losses</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bet Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No betting data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Performance (₹)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="won" name="Won" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lost" name="Lost" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card className="mb-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Wagered</p>
                  <p className="text-xl font-bold">₹{stats.totalWagered.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Won</p>
                  <p className="text-xl font-bold text-green-500">₹{stats.totalWon.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                  <p className={cn("text-xl font-bold", netProfit >= 0 ? "text-green-500" : "text-red-500")}>
                    {netProfit >= 0 ? "+" : ""}₹{netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bet History List */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Bets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bets.length > 0 ? (
                <div className="space-y-3">
                  {bets.map((bet) => (
                    <div
                      key={bet.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-all",
                        bet.status === "won" && "border-green-500/30 bg-green-500/5",
                        bet.status === "lost" && "border-red-500/30 bg-red-500/5",
                        bet.status === "pending" && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden">
                          {bet.bet_type === "team_a" && bet.matches?.team_a_logo ? (
                            <img src={bet.matches.team_a_logo} alt="" className="w-full h-full object-cover" />
                          ) : bet.bet_type === "team_b" && bet.matches?.team_b_logo ? (
                            <img src={bet.matches.team_b_logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🏏</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {bet.matches?.team_a} vs {bet.matches?.team_b}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bet on: {bet.bet_type === "team_a" ? bet.matches?.team_a : bet.matches?.team_b}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(bet.created_at), "dd MMM yyyy, hh:mm a")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">₹{Number(bet.amount).toLocaleString()}</p>
                        <Badge
                          variant={
                            bet.status === "won" ? "default" : bet.status === "lost" ? "destructive" : "secondary"
                          }
                          className={cn(
                            bet.status === "won" && "bg-green-500 hover:bg-green-600"
                          )}
                        >
                          {bet.status === "won"
                            ? `+₹${Number(bet.potential_winnings).toLocaleString()}`
                            : bet.status === "lost"
                            ? "Lost"
                            : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No bets placed yet</p>
                  <p className="text-sm">Start betting to see your history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BettingHistory;
