import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpFromLine, CheckCircle, Clock, XCircle, AlertTriangle, Plus, Trash2, CreditCard, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TransactionSuccess } from "@/components/ui/transaction-success";

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string | null;
  bank_name: string | null;
  account_type: string | null;
  upi_id: string | null;
  phone_pay_number: string | null;
  google_pay_number: string | null;
  paytm_number: string | null;
  is_primary: boolean;
  created_at: string;
}

const Withdraw = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Add Account Form State
  const [accountForm, setAccountForm] = useState({
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_type: "savings",
    upi_id: "",
    phone_pay_number: "",
    google_pay_number: "",
    paytm_number: "",
  });
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentWithdrawals();
      fetchBankAccounts();
    }
  }, [user]);

  const fetchBankAccounts = async () => {
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBankAccounts(data);
      const primaryAccount = data.find((acc) => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id);
      } else if (data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    }
  };

  const fetchRecentWithdrawals = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentWithdrawals(data);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    if (accountForm.account_number !== accountForm.confirm_account_number) {
      toast.error("Account numbers do not match");
      return;
    }

    if (!accountForm.account_holder_name || !accountForm.account_number) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsAddingAccount(true);

    try {
      // If this is the first account, make it primary
      const isPrimary = bankAccounts.length === 0;

      const { error } = await supabase.from("bank_accounts").insert({
        user_id: user.id,
        account_holder_name: accountForm.account_holder_name,
        account_number: accountForm.account_number,
        ifsc_code: accountForm.ifsc_code || null,
        bank_name: accountForm.bank_name || null,
        account_type: accountForm.account_type || "savings",
        upi_id: accountForm.upi_id || null,
        phone_pay_number: accountForm.phone_pay_number || null,
        google_pay_number: accountForm.google_pay_number || null,
        paytm_number: accountForm.paytm_number || null,
        is_primary: isPrimary,
      });

      if (error) throw error;

      toast.success("Bank account added successfully!");
      setAccountForm({
        account_holder_name: "",
        account_number: "",
        confirm_account_number: "",
        ifsc_code: "",
        bank_name: "",
        account_type: "savings",
        upi_id: "",
        phone_pay_number: "",
        google_pay_number: "",
        paytm_number: "",
      });
      fetchBankAccounts();
      setActiveTab("withdrawals");
    } catch (error: any) {
      console.error("Error adding bank account:", error);
      toast.error(error.message || "Failed to add bank account");
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;

      toast.success("Account removed successfully");
      fetchBankAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove account");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error("Please login to continue");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 100) {
      toast.error("Minimum withdrawal amount is ₹100");
      return;
    }

    if (withdrawAmount > profile.wallet_balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    const selectedAccount = bankAccounts.find((acc) => acc.id === selectedAccountId);
    if (!selectedAccount) {
      toast.error("Selected account not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const accountInfo = selectedAccount.upi_id 
        ? `UPI: ${selectedAccount.upi_id}` 
        : `Bank: ${selectedAccount.bank_name || 'N/A'} - ${selectedAccount.account_number.slice(-4)}`;

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "withdrawal",
        amount: -withdrawAmount,
        status: "pending",
        description: `Withdrawal to ${accountInfo}`,
      });

      if (txError) throw txError;

      setSuccessAmount(withdrawAmount);
      setShowSuccess(true);
      setAmount("");
      fetchRecentWithdrawals();
      refreshProfile();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Failed to submit withdrawal request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    toast.success("Withdrawal request submitted! Processing within 24 hours.");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const walletBalance = profile?.wallet_balance ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <TransactionSuccess
        isVisible={showSuccess}
        amount={successAmount}
        type="withdrawal"
        onComplete={handleSuccessComplete}
      />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Background Effects */}
          <div className="fixed top-1/3 right-1/4 w-72 h-72 bg-warning/10 rounded-full blur-[120px] -z-10" />
          <div className="fixed bottom-1/3 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px] -z-10" />

          {/* Header Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Withdrawal Request</h1>
            <p className="text-muted-foreground">
              Withdraw your winnings to your bank account or UPI
            </p>
          </div>

          {/* Balance Display */}
          <Card variant="neon" className="mb-6 animate-scale-in">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <span className="font-display text-2xl font-bold text-primary">
                  ₹{walletBalance.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="add-account">Add Account</TabsTrigger>
              <TabsTrigger value="account-history">Account History</TabsTrigger>
            </TabsList>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals">
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-5 w-5 text-warning" />
                    Request Withdrawal
                  </CardTitle>
                  <CardDescription>
                    Select your account and enter the amount to withdraw
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {walletBalance < 100 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <AlertTriangle className="h-12 w-12 text-warning mb-4" />
                      <p className="text-muted-foreground mb-2">Insufficient balance</p>
                      <p className="text-sm text-muted-foreground">
                        Minimum withdrawal amount is ₹100
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate("/deposit")}
                      >
                        Make a Deposit
                      </Button>
                    </div>
                  ) : bankAccounts.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No bank accounts added</p>
                      <p className="text-sm text-muted-foreground">
                        Add a bank account to start withdrawing
                      </p>
                      <Button
                        variant="neon"
                        className="mt-4"
                        onClick={() => setActiveTab("add-account")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label>Select Account</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bank account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_holder_name} - {account.bank_name || account.upi_id || "Account"} 
                                {account.account_number && ` (****${account.account_number.slice(-4)})`}
                                {account.is_primary && " (Primary)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="100"
                          max={walletBalance}
                          step="1"
                          placeholder="Enter amount (min ₹100)"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum: ₹{walletBalance.toFixed(2)}
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Note:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Withdrawals are processed within 24 hours</li>
                          <li>Ensure your account details are correct</li>
                          <li>Minimum withdrawal: ₹100</li>
                        </ul>
                      </div>

                      <Button
                        type="submit"
                        variant="neon"
                        className="w-full gap-2"
                        size="lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          <>
                            <ArrowUpFromLine className="h-4 w-4" />
                            Request Withdrawal
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add Account Tab */}
            <TabsContent value="add-account">
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Put Your Account Information
                  </CardTitle>
                  <p className="text-sm text-warning mt-2">
                    Note: If you are adding a new account, payment will go to that new account, instead of the old account.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddAccount} className="space-y-6">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                        <Input
                          id="account_holder_name"
                          placeholder="Enter Account Holder Name"
                          value={accountForm.account_holder_name}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, account_holder_name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_number">Account No *</Label>
                        <Input
                          id="account_number"
                          placeholder="Account No"
                          value={accountForm.account_number}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, account_number: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm_account_number">Repeat Account No *</Label>
                        <Input
                          id="confirm_account_number"
                          placeholder="Repeat Account No"
                          value={accountForm.confirm_account_number}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, confirm_account_number: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input
                          id="ifsc_code"
                          placeholder="Enter IFSC Code"
                          value={accountForm.ifsc_code}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, ifsc_code: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          placeholder="Enter Your Bank Name"
                          value={accountForm.bank_name}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, bank_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_type">A/c Type</Label>
                        <Select
                          value={accountForm.account_type}
                          onValueChange={(value) =>
                            setAccountForm({ ...accountForm, account_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select A/c Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="upi_id">UPI ID</Label>
                        <Input
                          id="upi_id"
                          placeholder="Enter Your UPI ID"
                          value={accountForm.upi_id}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, upi_id: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone_pay_number">Phone Pay Number</Label>
                        <Input
                          id="phone_pay_number"
                          placeholder="Enter Your Phone Pay Number"
                          value={accountForm.phone_pay_number}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, phone_pay_number: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="google_pay_number">Google Pay Number</Label>
                        <Input
                          id="google_pay_number"
                          placeholder="Enter Your Google Pay Number"
                          value={accountForm.google_pay_number}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, google_pay_number: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Row 4 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paytm_number">Paytm Number</Label>
                        <Input
                          id="paytm_number"
                          placeholder="Enter Your Paytm Number"
                          value={accountForm.paytm_number}
                          onChange={(e) =>
                            setAccountForm({ ...accountForm, paytm_number: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        type="submit"
                        variant="neon"
                        size="lg"
                        disabled={isAddingAccount}
                        className="min-w-[200px]"
                      >
                        {isAddingAccount ? (
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account History Tab */}
            <TabsContent value="account-history">
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Saved Accounts
                  </CardTitle>
                  <CardDescription>
                    Manage your saved bank accounts and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bankAccounts.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No accounts added yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setActiveTab("add-account")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Account
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bankAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border border-border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{account.account_holder_name}</p>
                              {account.is_primary && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                              {account.bank_name && (
                                <p>{account.bank_name} - ****{account.account_number.slice(-4)}</p>
                              )}
                              {account.upi_id && <p>UPI: {account.upi_id}</p>}
                              {account.phone_pay_number && <p>PhonePe: {account.phone_pay_number}</p>}
                              {account.google_pay_number && <p>GPay: {account.google_pay_number}</p>}
                              {account.paytm_number && <p>Paytm: {account.paytm_number}</p>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent Withdrawals Section */}
                  {recentWithdrawals.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Recent Withdrawals</h3>
                      <div className="space-y-3">
                        {recentWithdrawals.map((withdrawal) => (
                          <div
                            key={withdrawal.id}
                            className="p-3 bg-accent/30 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(withdrawal.status)}
                                <div>
                                  <p className="font-medium">₹{Math.abs(withdrawal.amount)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(withdrawal.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {withdrawal.screenshot_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setScreenshotPreview(withdrawal.screenshot_url)}
                                  >
                                    <Image className="h-4 w-4 mr-1" />
                                    Receipt
                                  </Button>
                                )}
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                                    withdrawal.status === "completed"
                                      ? "bg-success/20 text-success"
                                      : withdrawal.status === "pending"
                                      ? "bg-warning/20 text-warning"
                                      : "bg-destructive/20 text-destructive"
                                  }`}
                                >
                                  {withdrawal.status}
                                </span>
                              </div>
                            </div>
                            {withdrawal.admin_notes && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs text-muted-foreground">Admin Note:</p>
                                <p className="text-sm">{withdrawal.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Screenshot Preview Dialog */}
          <Dialog open={!!screenshotPreview} onOpenChange={() => setScreenshotPreview(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Payment Receipt</DialogTitle>
              </DialogHeader>
              {screenshotPreview && (
                <div className="flex justify-center">
                  <img 
                    src={screenshotPreview} 
                    alt="Payment receipt" 
                    className="max-h-[70vh] rounded-lg object-contain"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Withdraw;