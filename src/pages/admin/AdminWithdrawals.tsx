import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Clock, ArrowUpFromLine, Loader2, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WithdrawalWithUser {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  admin_notes: string | null;
  username: string | null;
  wallet_balance: number;
}

const AdminWithdrawalsContent = () => {
  const { isLoading } = useAdmin();
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithUser | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      // Fetch withdrawals
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      // Fetch profiles for user info
      const userIds = [...new Set(transactions?.map(t => t.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, wallet_balance")
        .in("user_id", userIds.length > 0 ? userIds : ["none"]);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const withdrawalsWithUsers: WithdrawalWithUser[] = (transactions || []).map(tx => ({
        ...tx,
        username: profileMap.get(tx.user_id)?.username || null,
        wallet_balance: profileMap.get(tx.user_id)?.wallet_balance || 0,
      }));

      setWithdrawals(withdrawalsWithUsers);
    } catch (error: any) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to fetch withdrawals");
    }
    setLoading(false);
  };

  const processWithdrawal = async (approved: boolean) => {
    if (!selectedWithdrawal) return;
    setProcessing(true);

    const { error } = await supabase.rpc("process_withdrawal", {
      p_transaction_id: selectedWithdrawal.id,
      p_approved: approved,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      toast.error(error.message || "Failed to process withdrawal");
    } else {
      toast.success(approved ? "Withdrawal approved - payment sent!" : "Withdrawal rejected");
      setSelectedWithdrawal(null);
      setAdminNotes("");
      fetchWithdrawals();
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/20 text-success border border-success/30">Paid</Badge>;
      case "pending":
        return <Badge className="bg-warning/20 text-warning border border-warning/30">Pending</Badge>;
      case "failed":
        return <Badge className="bg-destructive/20 text-destructive border border-destructive/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading || loading) {
    return (
      <AdminLayout title="Withdrawal Approvals">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const processedWithdrawals = withdrawals.filter((w) => w.status !== "pending");

  return (
    <AdminLayout title="Withdrawal Approvals">
      {/* Pending Withdrawals */}
      <Card variant="neon" className="mb-6 animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning animate-pulse" />
              Pending Withdrawals ({pendingWithdrawals.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchWithdrawals}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pending withdrawals</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingWithdrawals.map((withdrawal, index) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border border-border/50 hover:border-warning/30 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div>
                    <p className="font-display text-xl font-bold text-warning">₹{Math.abs(withdrawal.amount)}</p>
                    <p className="text-sm text-muted-foreground">{withdrawal.username || "Unknown user"}</p>
                    <p className="text-xs text-primary font-mono mt-1">
                      {withdrawal.description?.replace("Withdrawal to ", "") || "No UPI"}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(withdrawal.created_at).toLocaleString()}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedWithdrawal(withdrawal)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Withdrawals */}
      <Card variant="default" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5" />
            Processed Withdrawals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">UPI</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {processedWithdrawals.slice(0, 20).map((withdrawal, index) => (
                  <tr 
                    key={withdrawal.id} 
                    className="border-b border-border/50 hover:bg-accent/20 transition-colors animate-fade-in"
                    style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                  >
                    <td className="py-3 px-4 text-sm">{withdrawal.username || "Unknown"}</td>
                    <td className="py-3 px-4 font-display font-bold">₹{Math.abs(withdrawal.amount)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                      {withdrawal.description?.replace("Withdrawal to ", "") || "-"}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(withdrawal.status)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Withdrawal</DialogTitle>
            <DialogDescription>
              Verify user balance and process this withdrawal request.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedWithdrawal.username || "Unknown"}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-display text-2xl font-bold text-warning">₹{Math.abs(selectedWithdrawal.amount)}</p>
                </div>
                <div className="p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="font-medium">₹{selectedWithdrawal.wallet_balance}</p>
                </div>
                <div className="p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(selectedWithdrawal.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">UPI ID</p>
                <p className="font-medium font-mono text-primary text-lg">
                  {selectedWithdrawal.description?.replace("Withdrawal to ", "") || "Not provided"}
                </p>
              </div>

              {selectedWithdrawal.status === "pending" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Admin Notes</p>
                  <Textarea
                    placeholder="Add notes (optional)"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          {selectedWithdrawal?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => processWithdrawal(false)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              <Button
                className="bg-success hover:bg-success/90"
                onClick={() => processWithdrawal(true)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve & Pay
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const AdminWithdrawals = () => (
  <AdminProvider>
    <AdminWithdrawalsContent />
  </AdminProvider>
);

export default AdminWithdrawals;
