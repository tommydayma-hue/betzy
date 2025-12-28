import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Clock, ArrowDownToLine, Loader2, RefreshCw, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DepositWithUser {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  screenshot_url: string | null;
  created_at: string;
  admin_notes: string | null;
  username: string | null;
  wallet_balance: number;
}

const AdminDepositsContent = () => {
  const { isLoading } = useAdmin();
  const [deposits, setDeposits] = useState<DepositWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositWithUser | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      // Fetch deposits
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "deposit")
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      // Fetch profiles for user info
      const userIds = [...new Set(transactions?.map(t => t.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, wallet_balance")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const depositsWithUsers: DepositWithUser[] = (transactions || []).map(tx => ({
        ...tx,
        username: profileMap.get(tx.user_id)?.username || null,
        wallet_balance: profileMap.get(tx.user_id)?.wallet_balance || 0,
      }));

      setDeposits(depositsWithUsers);
    } catch (error: any) {
      console.error("Error fetching deposits:", error);
      toast.error("Failed to fetch deposits");
    }
    setLoading(false);
  };

  const processDeposit = async (approved: boolean) => {
    if (!selectedDeposit) return;
    setProcessing(true);

    const { error } = await supabase.rpc("process_deposit", {
      p_transaction_id: selectedDeposit.id,
      p_approved: approved,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      toast.error(error.message || "Failed to process deposit");
    } else {
      toast.success(approved ? "Deposit approved successfully!" : "Deposit rejected");
      setSelectedDeposit(null);
      setAdminNotes("");
      fetchDeposits();
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/20 text-success border border-success/30">Approved</Badge>;
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
      <AdminLayout title="Deposit Verification">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const pendingDeposits = deposits.filter((d) => d.status === "pending");
  const processedDeposits = deposits.filter((d) => d.status !== "pending");

  return (
    <AdminLayout title="Deposit Verification">
      {/* Pending Deposits */}
      <Card variant="neon" className="mb-6 animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning animate-pulse" />
              Pending Deposits ({pendingDeposits.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchDeposits}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingDeposits.length === 0 ? (
            <div className="text-center py-8">
              <ArrowDownToLine className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pending deposits</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingDeposits.map((deposit, index) => (
                <div
                  key={deposit.id}
                  className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border border-border/50 hover:border-primary/30 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    {deposit.screenshot_url && (
                      <img
                        src={deposit.screenshot_url}
                        alt="Screenshot"
                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-border"
                        onClick={() => setSelectedDeposit(deposit)}
                      />
                    )}
                    <div>
                      <p className="font-display text-xl font-bold text-success">₹{deposit.amount}</p>
                      <p className="text-sm text-muted-foreground">{deposit.username || "Unknown user"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(deposit.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedDeposit(deposit)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Deposits */}
      <Card variant="default" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Processed Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Screenshot</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {processedDeposits.slice(0, 20).map((deposit, index) => (
                  <tr 
                    key={deposit.id} 
                    className="border-b border-border/50 hover:bg-accent/20 transition-colors animate-fade-in"
                    style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                  >
                    <td className="py-3 px-4 text-sm">{deposit.username || "Unknown"}</td>
                    <td className="py-3 px-4 font-display font-bold">₹{deposit.amount}</td>
                    <td className="py-3 px-4">
                      {deposit.screenshot_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScreenshotPreview(deposit.screenshot_url)}
                          className="gap-1"
                        >
                          <Image className="h-3 w-3" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">No image</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(deposit.status)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(deposit.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                      {deposit.admin_notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Deposit</DialogTitle>
            <DialogDescription>
              Verify the payment and approve or reject this deposit request.
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedDeposit.username || "Unknown"}</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-display text-2xl font-bold text-success">₹{selectedDeposit.amount}</p>
                </div>
                <div className="p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="font-medium">₹{selectedDeposit.wallet_balance}</p>
                </div>
                <div className="p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(selectedDeposit.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedDeposit.screenshot_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Payment Screenshot</p>
                  <img
                    src={selectedDeposit.screenshot_url}
                    alt="Payment screenshot"
                    className="max-h-80 rounded-lg border border-border mx-auto"
                  />
                </div>
              )}

              {selectedDeposit.status === "pending" && (
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
          {selectedDeposit?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => processDeposit(false)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              <Button
                className="bg-success hover:bg-success/90"
                onClick={() => processDeposit(true)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Preview Dialog */}
      <Dialog open={!!screenshotPreview} onOpenChange={() => setScreenshotPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotPreview && (
            <div className="flex items-center justify-center">
              <img
                src={screenshotPreview}
                alt="Payment screenshot"
                className="max-h-[70vh] rounded-lg border border-border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const AdminDeposits = () => (
  <AdminProvider>
    <AdminDepositsContent />
  </AdminProvider>
);

export default AdminDeposits;
