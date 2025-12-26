import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, Upload, Copy, CheckCircle, Clock, XCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TransactionSuccess } from "@/components/ui/transaction-success";

const PAYMENT_DETAILS = {
  upiId: "betzone@paytm",
  accountName: "BetZone Payments",
};

const Deposit = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentDeposits();
    }
  }, [user]);

  const fetchRecentDeposits = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "deposit")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentDeposits(data);
    }
  };

  const handleCopyUPI = async () => {
    await navigator.clipboard.writeText(PAYMENT_DETAILS.upiId);
    setCopied(true);
    toast.success("UPI ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 100) {
      toast.error("Minimum deposit amount is ₹100");
      return;
    }

    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("deposit-screenshots")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("deposit-screenshots")
        .getPublicUrl(fileName);

      // Create transaction record with auto-approved status
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: depositAmount,
        status: "completed",
        screenshot_url: urlData.publicUrl,
        description: `Deposit of ₹${depositAmount} (auto-approved)`,
        processed_at: new Date().toISOString(),
      });

      if (txError) throw txError;

      // Update wallet balance directly using the auto_approve_deposit function
      const { error: balanceError } = await (supabase.rpc as any)('auto_approve_deposit', {
        p_user_id: user.id,
        p_amount: depositAmount
      });

      if (balanceError) throw balanceError;

      // Show success animation
      setSuccessAmount(depositAmount);
      setShowSuccess(true);
      
      setAmount("");
      setScreenshot(null);
      setPreviewUrl(null);
      fetchRecentDeposits();
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast.error(error.message || "Failed to submit deposit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    toast.success(`₹${successAmount} added to your wallet!`);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <TransactionSuccess
        isVisible={showSuccess}
        amount={successAmount}
        onComplete={handleSuccessComplete}
      />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Background Effects */}
          <div className="fixed top-1/3 left-1/4 w-72 h-72 bg-success/10 rounded-full blur-[120px] -z-10" />
          <div className="fixed bottom-1/3 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px] -z-10" />

          <Card variant="neon" className="animate-scale-in mb-8">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-success to-success/60 flex items-center justify-center mx-auto mb-4 glow-success">
                <ArrowDownToLine className="h-8 w-8 text-success-foreground" />
              </div>
              <CardTitle className="text-2xl">Deposit Funds</CardTitle>
              <CardDescription>Add money to your wallet</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Payment Details */}
              <div className="bg-accent/50 rounded-lg p-4 mb-6 border border-border">
                <h3 className="font-semibold mb-3 text-sm">Payment Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">UPI ID</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                        {PAYMENT_DETAILS.upiId}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopyUPI}
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <span className="text-sm font-medium">{PAYMENT_DETAILS.accountName}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="100"
                    step="1"
                    placeholder="Enter amount (min ₹100)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshot">Payment Screenshot</Label>
                  <div className="relative">
                    {previewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img
                          src={previewUrl}
                          alt="Payment screenshot"
                          className="w-full h-48 object-cover"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 right-2"
                          onClick={() => {
                            setScreenshot(null);
                            setPreviewUrl(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="screenshot"
                        className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload screenshot
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          Max 5MB, JPG/PNG
                        </span>
                      </label>
                    )}
                    <input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
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
                      <Upload className="h-4 w-4" />
                      Submit Deposit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Deposits */}
          {recentDeposits.length > 0 && (
            <Card variant="default" className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Recent Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentDeposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deposit.status)}
                        <div>
                          <p className="font-medium">₹{deposit.amount}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(deposit.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                          deposit.status === "completed"
                            ? "bg-success/20 text-success"
                            : deposit.status === "pending"
                            ? "bg-warning/20 text-warning"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {deposit.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Deposit;
