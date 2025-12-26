import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Copy, CheckCircle, Clock, XCircle, ImageIcon, 
  ArrowLeft, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TransactionSuccess } from "@/components/ui/transaction-success";
import { cn } from "@/lib/utils";

interface PaymentInfo {
  upi_id: string;
  qr_code_url: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name?: string;
  google_pay?: string;
  phone_pay?: string;
  paytm?: string;
}

const DEMO_SCREENSHOTS = [
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=400&fit=crop",
  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=400&fit=crop",
  "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=300&h=400&fit=crop",
];

const Deposit = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    upi_id: "",
    qr_code_url: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_holder_name: "",
  });
  const [minDeposit, setMinDeposit] = useState(100);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentDeposits();
      fetchPaymentSettings();
    }
  }, [user]);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["payment_info", "site_config"]);

      if (!error && data) {
        data.forEach((setting) => {
          if (setting.key === "payment_info") {
            setPaymentInfo(setting.value as unknown as PaymentInfo);
          }
          if (setting.key === "site_config") {
            const config = setting.value as any;
            if (config.min_deposit) setMinDeposit(config.min_deposit);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
    }
  };

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

  const handleCopy = async (text: string, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
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
    if (isNaN(depositAmount) || depositAmount < minDeposit) {
      toast.error(`Minimum deposit amount is ₹${minDeposit}`);
      return;
    }

    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("deposit-screenshots")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("deposit-screenshots")
        .getPublicUrl(fileName);

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

      const { error: balanceError } = await (supabase.rpc as any)('auto_approve_deposit', {
        p_user_id: user.id,
        p_amount: depositAmount
      });

      if (balanceError) throw balanceError;

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
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % DEMO_SCREENSHOTS.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + DEMO_SCREENSHOTS.length) % DEMO_SCREENSHOTS.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const PaymentDetailRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate">
          {label}:{" "}
          <span className="font-semibold text-gray-900 break-all">{value || "-"}</span>
        </span>
      </div>
      <button
        onClick={() => handleCopy(value, field)}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        disabled={!value}
      >
        {copiedField === field ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-white">
      <Header />
      
      <TransactionSuccess
        isVisible={showSuccess}
        amount={successAmount}
        onComplete={handleSuccessComplete}
      />

      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">MAKE DEPOSIT</h1>
            <p className="text-gray-600">
              Experience the thrill of gaming with live stats and instant updates – your winning edge starts here!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left Column - Process & Payment Details */}
            <div className="space-y-6">
              {/* Deposit Process Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold text-red-500 mb-3">Deposit Process:</h3>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex gap-2">
                      <span className="font-bold text-gray-800">1.</span>
                      <span>Simply make your payment using the provided details and then take a quick screenshot of the transaction, ensuring the <strong>Unique Transaction Reference (UTR)</strong> number is clearly visible.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-gray-800">2.</span>
                      <span>In case you encounter any issues, feel free to reach out to our helpful support team for further assistance.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-gray-800">3.</span>
                      <span>Please ensure that your uploaded screenshot matches the examples provided.</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* Payment Details Card */}
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Details:</h3>
                  <div className="space-y-1">
                    <PaymentDetailRow 
                      label="Name" 
                      value={paymentInfo.account_holder_name || "Inspiro Bet"} 
                      field="name" 
                    />
                    <PaymentDetailRow 
                      label="UPI ID" 
                      value={paymentInfo.upi_id} 
                      field="upi" 
                    />
                    <PaymentDetailRow 
                      label="A/C no" 
                      value={paymentInfo.account_number} 
                      field="account" 
                    />
                    <PaymentDetailRow 
                      label="IFSC code" 
                      value={paymentInfo.ifsc_code} 
                      field="ifsc" 
                    />
                    <PaymentDetailRow 
                      label="Bank Name" 
                      value={paymentInfo.bank_name} 
                      field="bank" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Demo Screenshots & Form */}
            <div className="space-y-6">
              {/* Demo Screenshots */}
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold text-red-500 text-center mb-4">Demo Screenshot</h3>
                  <div className="relative">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={prevSlide}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <div className="flex gap-3 overflow-hidden">
                        {DEMO_SCREENSHOTS.map((src, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "w-24 h-32 rounded-lg overflow-hidden border-2 transition-all duration-300",
                              idx === currentSlide ? "border-blue-500 scale-105" : "border-gray-200 opacity-60"
                            )}
                          >
                            <img 
                              src={src} 
                              alt={`Demo ${idx + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={nextSlide}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                      {DEMO_SCREENSHOTS.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-2 h-2 rounded-full transition-colors",
                            idx === currentSlide ? "bg-blue-500" : "bg-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Deposit Form */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Deposit Information:</h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Input
                          type="number"
                          min={minDeposit}
                          placeholder={`Enter amount (min ₹${minDeposit})`}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-11 border-gray-300 bg-gray-50"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="screenshot-upload"
                          className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-600">
                            {screenshot ? screenshot.name : "Choose File"}
                          </span>
                        </label>
                        <input
                          id="screenshot-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <span className="text-sm text-gray-500">Upload Image</span>
                      </div>

                      {previewUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-32 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScreenshot(null);
                              setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(-1)}
                          className="flex-1 border-gray-800 text-gray-800 hover:bg-gray-100"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-gray-800 hover:bg-gray-900 text-white"
                        >
                          {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Warning Note */}
          <div className="text-center mb-8">
            <p className="text-red-500 font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              NOTE: IF PAYMENT DETAILS NOT WORKING, THEN REFRESH THE PAGE.
              <RefreshCw className="h-4 w-4" />
            </p>
          </div>

          {/* QR Code Section */}
          <div className="bg-gradient-to-r from-cyan-100 via-sky-100 to-cyan-100 rounded-2xl p-8 mb-8">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl shadow-md">
                {paymentInfo.qr_code_url ? (
                  <img
                    src={paymentInfo.qr_code_url}
                    alt="Payment QR Code"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                    <div className="text-center text-gray-400">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <span className="text-sm">QR Code</span>
                    </div>
                  </div>
                )}
                <div className="text-center mt-2">
                  <p className="text-xs text-gray-500">Scan & Pay</p>
                  <p className="text-xs font-semibold text-gray-700">UPI / BHIM</p>
                </div>
              </div>

              {/* Decorative Image */}
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-64 h-48 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-2xl flex items-center justify-center">
                    <span className="text-6xl">💰</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Deposits */}
          {recentDeposits.length > 0 && (
            <Card className="bg-white shadow-sm border-gray-200">
              <CardContent className="p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Deposits</h3>
                <div className="space-y-3">
                  {recentDeposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deposit.status)}
                        <div>
                          <p className="font-medium text-gray-800">₹{deposit.amount}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(deposit.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded capitalize",
                          deposit.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : deposit.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {deposit.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
            <p>⚠️ Always verify the payment details before making a transaction.</p>
            <p>📞 For any issues, contact our 24/7 support team.</p>
            <p>🔒 All transactions are secure and encrypted.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Deposit;
