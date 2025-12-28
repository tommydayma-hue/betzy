import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  History, 
  Coins, 
  Target,
  Loader2,
  Trophy,
  Clock,
  UserCog
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RecentBet {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  type: string;
  description: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({ totalWins: 0, totalBets: 0 });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch recent transactions for betting activity
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("type", ["bet_placed", "bet_won"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (transactions) {
        setRecentBets(transactions as RecentBet[]);
      }

      // Calculate stats
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user.id)
        .in("type", ["bet_placed", "bet_won"]);

      if (allTransactions) {
        const wins = allTransactions.filter(t => t.type === "bet_won").length;
        const bets = allTransactions.filter(t => t.type === "bet_placed").length;
        setStats({ totalWins: wins, totalBets: bets });
      }

      setLoadingData(false);
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile?.username || user.email?.split('@')[0] || 'Player';
  const walletBalance = profile?.wallet_balance ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Hello, <span className="text-blue-600">{displayName}</span>
            </h1>
          </div>

          {/* Wallet Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-xl font-bold text-gray-900">₹{Number(walletBalance).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link to="/deposit">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    <ArrowDownToLine className="h-4 w-4" />
                    Deposit
                  </button>
                </Link>
                <Link to="/withdraw">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                    <ArrowUpFromLine className="h-4 w-4" />
                    Withdraw
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Wins</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalWins}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Bets</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalBets}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link to="/matches">
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Live Matches</p>
                    <p className="text-xs text-gray-500">Bet on sports</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/coinflip">
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Coin Flip</p>
                    <p className="text-xs text-gray-500">Win 2x instantly</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/profile">
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <UserCog className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Edit Profile</p>
                    <p className="text-xs text-gray-500">Update your info</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
              <Link to="/history" className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="p-4">
              {loadingData ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              ) : recentBets.length === 0 ? (
                <div className="text-center py-6">
                  <History className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500 text-sm">No activity yet</p>
                  <p className="text-xs text-gray-400">Start betting to see your history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBets.map((bet) => (
                    <div 
                      key={bet.id} 
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          bet.type === "bet_won" ? "bg-green-50" : "bg-gray-100"
                        )}>
                          {bet.type === "bet_won" ? (
                            <Trophy className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {bet.type === "bet_won" ? "Won" : "Bet Placed"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(bet.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short"
                            })}
                          </p>
                        </div>
                      </div>
                      <p className={cn(
                        "text-sm font-semibold",
                        bet.type === "bet_won" ? "text-green-600" : "text-gray-700"
                      )}>
                        {bet.type === "bet_won" ? "+" : ""}₹{bet.amount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
