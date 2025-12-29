import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Clock, ArrowUpFromLine, Loader2, RefreshCw, Wallet, Upload, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string | null;
  ifsc_code: string | null;
  account_type: string | null;
  upi_id: string | null;
  paytm_number: string | null;
  google_pay_number: string | null;
  phone_pay_number: string | null;
  is_primary: boolean;
}

interface WithdrawalWithUser {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  admin_notes: string | null;
  screenshot_url: string | null;
  username: string | null;
  wallet_balance: number;
  bank_accounts: BankAccount[];
}

const AdminWithdrawalsContent = () => {
  const { isLoading } = useAdmin();
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithUser | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

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

      // Fetch bank accounts for all users
      const { data: bankAccounts, error: bankError } = await supabase
        .from("bank_accounts")
        .select("*")
        .in("user_id", userIds.length > 0 ? userIds : ["none"]);

      if (bankError) throw bankError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const bankAccountsMap = new Map<string, BankAccount[]>();
      
      bankAccounts?.forEach(account => {
        const existing = bankAccountsMap.get(account.user_id) || [];
        existing.push(account);
        bankAccountsMap.set(account.user_id, existing);
      });

      const withdrawalsWithUsers: WithdrawalWithUser[] = (transactions || []).map(tx => ({
        ...tx,
        username: profileMap.get(tx.user_id)?.username || null,
        wallet_balance: profileMap.get(tx.user_id)?.wallet_balance || 0,
        bank_accounts: bankAccountsMap.get(tx.user_id) || [],
      }));

      setWithdrawals(withdrawalsWithUsers);
    } catch (error: any) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to fetch withdrawals");
    }
    setLoading(false);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentScreenshot(e.target.files[0]);
    }
  };

  const uploadScreenshot = async (transactionId: string): Promise<string | null> => {
    if (!paymentScreenshot) return null;
    
    setUploadingScreenshot(true);
    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${transactionId}-payment-${Date.now()}.${fileExt}`;
      const filePath = `withdrawals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(filePath, paymentScreenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading screenshot:", error);
      toast.error("Failed to upload payment screenshot");
      return null;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const processWithdrawal = async (approved: boolean) => {
    if (!selectedWithdrawal) return;
    setProcessing(true);

    let screenshotUrl: string | null = null;
    
    // Upload screenshot if provided and approved
    if (approved && paymentScreenshot) {
      screenshotUrl = await uploadScreenshot(selectedWithdrawal.id);
    }

    const { error } = await supabase.rpc("process_withdrawal", {
      p_transaction_id: selectedWithdrawal.id,
      p_approved: approved,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      toast.error(error.message || "Failed to process withdrawal");
    } else {
      // Update screenshot_url if we uploaded one
      if (screenshotUrl) {
        await supabase
          .from('transactions')
          .update({ screenshot_url: screenshotUrl })
          .eq('id', selectedWithdrawal.id);
      }
      
      toast.success(approved ? "Withdrawal approved - payment sent!" : "Withdrawal rejected");
      setSelectedWithdrawal(null);
      setAdminNotes("");
      setPaymentScreenshot(null);
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payment</th>
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
                    <td className="py-3 px-4">
                      {withdrawal.screenshot_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setScreenshotPreview(withdrawal.screenshot_url)}
                        >
                          <Image className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
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

              {/* Bank Account Details */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-3">
                <p className="text-sm font-semibold text-primary mb-2">Bank & Payment Details</p>
                
                {selectedWithdrawal.bank_accounts.length > 0 ? (
                  selectedWithdrawal.bank_accounts.map((account, idx) => (
                    <div key={account.id} className={`space-y-2 ${idx > 0 ? 'pt-3 border-t border-border/50' : ''}`}>
                      {account.is_primary && (
                        <Badge className="bg-primary/20 text-primary text-xs mb-2">Primary Account</Badge>
                      )}
                      
                      {/* Bank Details */}
                      {(account.bank_name || account.account_number) && (
                        <div className="grid grid-cols-2 gap-2">
                          {account.account_holder_name && (
                            <div>
                              <p className="text-xs text-muted-foreground">Account Holder</p>
                              <p className="font-medium text-sm">{account.account_holder_name}</p>
                            </div>
                          )}
                          {account.bank_name && (
                            <div>
                              <p className="text-xs text-muted-foreground">Bank Name</p>
                              <p className="font-medium text-sm">{account.bank_name}</p>
                            </div>
                          )}
                          {account.account_number && (
                            <div>
                              <p className="text-xs text-muted-foreground">Account Number</p>
                              <p className="font-mono text-sm">{account.account_number}</p>
                            </div>
                          )}
                          {account.ifsc_code && (
                            <div>
                              <p className="text-xs text-muted-foreground">IFSC Code</p>
                              <p className="font-mono text-sm">{account.ifsc_code}</p>
                            </div>
                          )}
                          {account.account_type && (
                            <div>
                              <p className="text-xs text-muted-foreground">Account Type</p>
                              <p className="font-medium text-sm capitalize">{account.account_type}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* UPI & Digital Wallets */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {account.upi_id && (
                          <div>
                            <p className="text-xs text-muted-foreground">UPI ID</p>
                            <p className="font-mono text-sm text-primary">{account.upi_id}</p>
                          </div>
                        )}
                        {account.paytm_number && (
                          <div>
                            <p className="text-xs text-muted-foreground">Paytm</p>
                            <p className="font-mono text-sm">{account.paytm_number}</p>
                          </div>
                        )}
                        {account.google_pay_number && (
                          <div>
                            <p className="text-xs text-muted-foreground">Google Pay</p>
                            <p className="font-mono text-sm">{account.google_pay_number}</p>
                          </div>
                        )}
                        {account.phone_pay_number && (
                          <div>
                            <p className="text-xs text-muted-foreground">PhonePe</p>
                            <p className="font-mono text-sm">{account.phone_pay_number}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">No bank account details found</p>
                    {selectedWithdrawal.description && (
                      <p className="font-mono text-primary mt-1">
                        {selectedWithdrawal.description.replace("Withdrawal to ", "")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selectedWithdrawal.status === "pending" && (
                <>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2">Payment Screenshot</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="cursor-pointer"
                      />
                      {paymentScreenshot && (
                        <p className="text-xs text-success mt-1">
                          Selected: {paymentScreenshot.name}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload payment confirmation screenshot (optional)
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2">Admin Notes</Label>
                    <Textarea
                      placeholder="Add notes (optional)"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {selectedWithdrawal?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => processWithdrawal(false)}
                disabled={processing || uploadingScreenshot}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              <Button
                className="bg-success hover:bg-success/90"
                onClick={() => processWithdrawal(true)}
                disabled={processing || uploadingScreenshot}
              >
                {(processing || uploadingScreenshot) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve & Pay
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Preview Dialog */}
      <Dialog open={!!screenshotPreview} onOpenChange={() => setScreenshotPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotPreview && (
            <div className="flex justify-center">
              <img 
                src={screenshotPreview} 
                alt="Payment screenshot" 
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
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
