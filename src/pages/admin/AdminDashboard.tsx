import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, ArrowDownToLine, ArrowUpFromLine, Trophy, Coins, TrendingUp, 
  Activity, RefreshCw, Loader2, BarChart3, CircleDollarSign, ThumbsUp, ThumbsDown, Percent 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

const AdminDashboardContent = () => {
  const { isLoading } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    activeMatches: 0,
    totalBets: 0,
    totalVolume: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    coinflipGames: 0,
    coinflipWins: 0,
    coinflipLosses: 0,
    coinflipHouseProfit: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch pending deposits
      const { count: depositCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "deposit")
        .eq("status", "pending");

      // Fetch pending withdrawals
      const { count: withdrawalCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "withdrawal")
        .eq("status", "pending");

      // Fetch active matches
      const { count: matchCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .in("status", ["upcoming", "live"]);

      // Fetch total bets
      const { count: betCount } = await supabase
        .from("bets")
        .select("*", { count: "exact", head: true });

      // Fetch total volume from bets
      const { data: volumeData } = await supabase
        .from("bets")
        .select("amount");

      const totalVolume = volumeData?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;

      // Fetch total deposits
      const { data: depositData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "deposit")
        .eq("status", "completed");

      const totalDeposits = depositData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      // Fetch total withdrawals
      const { data: withdrawalData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "withdrawal")
        .eq("status", "completed");

      const totalWithdrawals = withdrawalData?.reduce((sum, w) => sum + Math.abs(Number(w.amount)), 0) || 0;

      // Fetch coin flip statistics
      const { data: coinflipWinsData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "bet_won")
        .eq("status", "completed")
        .ilike("description", "%coin flip%");

      const { data: coinflipLossesData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "bet_placed")
        .eq("status", "completed")
        .ilike("description", "%coin flip%");

      const coinflipWins = coinflipWinsData?.length || 0;
      const coinflipLosses = coinflipLossesData?.length || 0;
      const coinflipGames = coinflipWins + coinflipLosses;
      
      // House profit = losses (amount users lost) - wins (amount house paid out)
      const totalLosses = coinflipLossesData?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
      const totalWinPayouts = coinflipWinsData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const coinflipHouseProfit = totalLosses - totalWinPayouts;

      // Fetch recent transactions for activity
      const { data: recentTx } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivity(recentTx || []);

      // Generate chart data (last 7 days mock for demo)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const mockChart = days.map((day, i) => ({
        name: day,
        deposits: Math.floor(Math.random() * 5000) + 1000,
        withdrawals: Math.floor(Math.random() * 3000) + 500,
        bets: Math.floor(Math.random() * 10000) + 2000,
      }));
      setChartData(mockChart);

      setStats({
        totalUsers: userCount || 0,
        pendingDeposits: depositCount || 0,
        pendingWithdrawals: withdrawalCount || 0,
        activeMatches: matchCount || 0,
        totalBets: betCount || 0,
        totalVolume,
        totalDeposits,
        totalWithdrawals,
        coinflipGames,
        coinflipWins,
        coinflipLosses,
        coinflipHouseProfit,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
    setLoading(false);
  };

  if (isLoading || loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pending Deposits", value: stats.pendingDeposits, icon: ArrowDownToLine, color: "text-success", bg: "bg-success/10", alert: stats.pendingDeposits > 0 },
    { label: "Pending Withdrawals", value: stats.pendingWithdrawals, icon: ArrowUpFromLine, color: "text-warning", bg: "bg-warning/10", alert: stats.pendingWithdrawals > 0 },
    { label: "Active Matches", value: stats.activeMatches, icon: Trophy, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Bets", value: stats.totalBets, icon: Coins, color: "text-muted-foreground", bg: "bg-muted/30" },
    { label: "Bet Volume", value: `₹${stats.totalVolume.toLocaleString()}`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  ];

  const coinflipCards = [
    { label: "Coin Flip Games", value: stats.coinflipGames, icon: Coins, color: "text-primary", bg: "bg-primary/10" },
    { label: "Player Wins", value: stats.coinflipWins, icon: ThumbsUp, color: "text-success", bg: "bg-success/10" },
    { label: "Player Losses", value: stats.coinflipLosses, icon: ThumbsDown, color: "text-destructive", bg: "bg-destructive/10" },
    { 
      label: "House Profit", 
      value: `₹${stats.coinflipHouseProfit.toLocaleString()}`, 
      icon: CircleDollarSign, 
      color: stats.coinflipHouseProfit >= 0 ? "text-success" : "text-destructive", 
      bg: stats.coinflipHouseProfit >= 0 ? "bg-success/10" : "bg-destructive/10" 
    },
  ];

  const pieData = [
    { name: 'Deposits', value: stats.totalDeposits, color: 'hsl(142, 76%, 45%)' },
    { name: 'Withdrawals', value: stats.totalWithdrawals, color: 'hsl(38, 92%, 50%)' },
    { name: 'Bets', value: stats.totalVolume, color: 'hsl(217, 99%, 56%)' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.label} 
            variant="default" 
            className={`animate-fade-in transition-all hover:scale-[1.02] ${stat.alert ? 'border-warning/50' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{stat.value}</p>
              {stat.alert && (
                <p className="text-xs text-warning mt-1 animate-pulse">Requires attention</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coin Flip Statistics */}
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Coins className="h-5 w-5 text-primary" />
        Coin Flip Statistics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {coinflipCards.map((stat, index) => (
          <Card 
            key={stat.label} 
            variant="default" 
            className="animate-fade-in transition-all hover:scale-[1.02]"
            style={{ animationDelay: `${(index + 6) * 0.1}s` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Activity Chart */}
        <Card variant="default" className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 99%, 56%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(217, 99%, 56%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 20%, 20%)" />
                  <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(240, 27%, 13%)', 
                      border: '1px solid hsl(240, 20%, 20%)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="deposits" stroke="hsl(142, 76%, 45%)" fillOpacity={1} fill="url(#colorDeposits)" />
                  <Area type="monotone" dataKey="bets" stroke="hsl(217, 99%, 56%)" fillOpacity={1} fill="url(#colorBets)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Pie */}
        <Card variant="default" className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                    contentStyle={{ 
                      background: 'hsl(240, 27%, 13%)', 
                      border: '1px solid hsl(240, 20%, 20%)',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card variant="default" className="animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((tx, index) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 bg-accent/30 rounded-lg animate-fade-in"
                  style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'deposit' ? 'bg-success/20' : 
                      tx.type === 'withdrawal' ? 'bg-warning/20' : 'bg-primary/20'
                    }`}>
                      {tx.type === 'deposit' ? (
                        <ArrowDownToLine className="h-4 w-4 text-success" />
                      ) : tx.type === 'withdrawal' ? (
                        <ArrowUpFromLine className="h-4 w-4 text-warning" />
                      ) : (
                        <Coins className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-display font-bold ${
                      tx.amount > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className={`text-xs capitalize ${
                      tx.status === 'completed' ? 'text-success' :
                      tx.status === 'pending' ? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

const AdminDashboard = () => (
  <AdminProvider>
    <AdminDashboardContent />
  </AdminProvider>
);

export default AdminDashboard;
