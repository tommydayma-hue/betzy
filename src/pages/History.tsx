import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Coins,
  Wallet,
  ArrowDownToLine,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
  List
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description: string | null;
  screenshot_url: string | null;
  reference_id: string | null;
}

interface Bet {
  id: string;
  bet_type: string;
  amount: number;
  odds: number;
  potential_winnings: number;
  status: string;
  created_at: string;
  matches: {
    team_a: string;
    team_b: string;
    sport: string;
    status: string;
    league: string | null;
  } | null;
}

const History = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [walletFilter, setWalletFilter] = useState<"all" | "credit" | "debit">("all");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: betData } = await supabase
      .from("bets")
      .select(`*, matches (team_a, team_b, sport, status, league)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (txData) setTransactions(txData);
    if (betData) setBets(betData as Bet[]);
    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd MMM, hh:mm a");
  };

  const formatDateFull = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy hh:mm a");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "won":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
      case "lost":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const deposits = transactions.filter(tx => tx.type === "deposit");
  const coinflipTx = transactions.filter(tx => 
    tx.description?.toLowerCase().includes("coin flip") || 
    tx.description?.toLowerCase().includes("coinflip")
  );
  
  const isCredit = (tx: Transaction) => 
    tx.type === "deposit" || tx.type === "bet_won" || tx.type === "bonus" || tx.type === "bet_refunded";
  
  const walletTx = transactions.filter(tx => {
    if (walletFilter === "all") return true;
    if (walletFilter === "credit") return isCredit(tx);
    if (walletFilter === "debit") return !isCredit(tx);
    return true;
  });

  const paginate = <T,>(items: T[], page: number): T[] => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  };

  const getTotalPages = (totalItems: number) => Math.ceil(totalItems / itemsPerPage);

  const getCurrentItems = () => {
    switch (activeTab) {
      case "all": return transactions;
      case "bets": return bets;
      case "deposits": return deposits;
      case "wallet": return walletTx;
      case "coinflip": return coinflipTx;
      default: return [];
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const data = transactions.map(tx => ({
        "Date": formatDateFull(tx.created_at),
        "Type": tx.type.replace(/_/g, " ").toUpperCase(),
        "Amount": `₹${Math.abs(tx.amount)}`,
        "Credit/Debit": isCredit(tx) ? "Credit" : "Debit",
        "Status": tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
        "Description": tx.description || "-",
        "Transaction ID": tx.id,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      
      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Date
        { wch: 15 }, // Type
        { wch: 12 }, // Amount
        { wch: 12 }, // Credit/Debit
        { wch: 12 }, // Status
        { wch: 30 }, // Description
        { wch: 40 }, // Transaction ID
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `transactions_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
      toast.success("Excel file downloaded!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel");
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text("Transaction History", 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), "dd/MM/yyyy hh:mm a")}`, 14, 30);

      // Table data
      const tableData = transactions.map(tx => [
        formatDateFull(tx.created_at),
        tx.type.replace(/_/g, " ").toUpperCase(),
        `₹${Math.abs(tx.amount)}`,
        isCredit(tx) ? "Credit" : "Debit",
        tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
      ]);

      autoTable(doc, {
        head: [["Date", "Type", "Amount", "Credit/Debit", "Status"]],
        body: tableData,
        startY: 38,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`transactions_${format(new Date(), "dd-MM-yyyy")}.pdf`);
      toast.success("PDF file downloaded!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, walletFilter]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalPages = getTotalPages(getCurrentItems().length);

  const tabItems = [
    { value: "all", label: "All", icon: List },
    { value: "bets", label: "Bets", icon: Trophy },
    { value: "deposits", label: "Deposits", icon: ArrowDownToLine },
    { value: "wallet", label: "Wallet", icon: Wallet },
    { value: "coinflip", label: "Coin Flip", icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-16 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          {/* Page Header with Export */}
          <div className="py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">History</h1>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-red-600" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tab Navigation - Scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === tab.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="mt-4 space-y-3">
            {/* All Transactions */}
            {activeTab === "all" && (
              <>
                {transactions.length === 0 ? (
                  <EmptyState icon={List} message="No transactions yet" />
                ) : (
                  paginate(transactions, currentPage).map((tx) => {
                    const isCreditTx = isCredit(tx);
                    return (
                      <div key={tx.id} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              isCreditTx ? "bg-green-50" : "bg-red-50"
                            )}>
                              {isCreditTx ? (
                                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                              ) : (
                                <Wallet className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 capitalize">
                                {tx.type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                              {tx.description && (
                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{tx.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-semibold", isCreditTx ? "text-green-600" : "text-red-600")}>
                              {isCreditTx ? "+" : "-"}₹{Math.abs(tx.amount)}
                            </p>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusColor(tx.status))}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* Bet History */}
            {activeTab === "bets" && (
              <>
                {bets.length === 0 ? (
                  <EmptyState 
                    icon={Trophy} 
                    message="No bets placed yet" 
                    action={{ label: "Place Bet", href: "/matches" }}
                  />
                ) : (
                  paginate(bets, currentPage).map((bet) => (
                    <div key={bet.id} className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {bet.matches?.team_a} vs {bet.matches?.team_b}
                          </p>
                          <p className="text-xs text-gray-500">{bet.matches?.league || bet.matches?.sport}</p>
                        </div>
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(bet.status))}>
                          {bet.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-gray-500">Pick: </span>
                          <span className="font-medium text-blue-600">
                            {bet.bet_type === "team_a" ? bet.matches?.team_a : bet.matches?.team_b}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₹{bet.amount}</p>
                          <p className="text-xs text-gray-500">{formatDate(bet.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Deposit History */}
            {activeTab === "deposits" && (
              <>
                {deposits.length === 0 ? (
                  <EmptyState 
                    icon={ArrowDownToLine} 
                    message="No deposits yet" 
                    action={{ label: "Deposit", href: "/deposit" }}
                  />
                ) : (
                  paginate(deposits, currentPage).map((tx) => (
                    <div key={tx.id} className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">Deposit</p>
                          <p className="text-xs text-gray-500 font-mono">{tx.id.slice(0, 8)}...</p>
                        </div>
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(tx.status))}>
                          {tx.status === "completed" ? "Approved" : tx.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          {tx.screenshot_url && (
                            <button
                              onClick={() => setScreenshotUrl(tx.screenshot_url)}
                              className="flex items-center gap-1 text-blue-600 text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">+₹{Math.abs(tx.amount)}</p>
                          <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Wallet History */}
            {activeTab === "wallet" && (
              <>
                {/* Credit/Debit Filter */}
                <div className="flex gap-2 mb-3">
                  {[
                    { value: "all", label: "All" },
                    { value: "credit", label: "Credit" },
                    { value: "debit", label: "Debit" },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setWalletFilter(filter.value as "all" | "credit" | "debit")}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                        walletFilter === filter.value
                          ? filter.value === "credit" 
                            ? "bg-green-600 text-white"
                            : filter.value === "debit"
                            ? "bg-red-600 text-white"
                            : "bg-gray-800 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {walletTx.length === 0 ? (
                  <EmptyState icon={Wallet} message={walletFilter === "all" ? "No transactions yet" : `No ${walletFilter} transactions`} />
                ) : (
                  paginate(walletTx, currentPage).map((tx) => {
                    const isCreditTx = isCredit(tx);
                    return (
                      <div key={tx.id} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              isCreditTx ? "bg-green-50" : "bg-red-50"
                            )}>
                              {isCreditTx ? (
                                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                              ) : (
                                <Wallet className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 capitalize">
                                {tx.type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-semibold", isCreditTx ? "text-green-600" : "text-red-600")}>
                              {isCreditTx ? "+" : "-"}₹{Math.abs(tx.amount)}
                            </p>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusColor(tx.status))}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* Coin Flip History */}
            {activeTab === "coinflip" && (
              <>
                {coinflipTx.length === 0 ? (
                  <EmptyState 
                    icon={Coins} 
                    message="No coin flip games yet" 
                    action={{ label: "Play Now", href: "/coinflip" }}
                  />
                ) : (
                  paginate(coinflipTx, currentPage).map((tx) => {
                    const isWin = tx.type === "bet_won";
                    return (
                      <div key={tx.id} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              isWin ? "bg-green-50" : "bg-red-50"
                            )}>
                              <Coins className={cn("w-5 h-5", isWin ? "text-green-600" : "text-red-500")} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {isWin ? "Won" : "Lost"}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                            </div>
                          </div>
                          <p className={cn("font-semibold text-lg", isWin ? "text-green-600" : "text-red-600")}>
                            {isWin ? "+" : "-"}₹{Math.abs(tx.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {currentPage}/{totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Screenshot Dialog */}
      <Dialog open={!!screenshotUrl} onOpenChange={() => setScreenshotUrl(null)}>
        <DialogContent className="max-w-sm mx-4 bg-white">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
            <DialogDescription>Uploaded proof of payment</DialogDescription>
          </DialogHeader>
          {screenshotUrl && (
            <img src={screenshotUrl} alt="Screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ 
  icon: Icon, 
  message, 
  action 
}: { 
  icon: any; 
  message: string; 
  action?: { label: string; href: string } 
}) => {
  const navigate = useNavigate();
  return (
    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
      <Icon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500">{message}</p>
      {action && (
        <Button 
          onClick={() => navigate(action.href)} 
          className="mt-4 bg-blue-600 hover:bg-blue-700"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default History;