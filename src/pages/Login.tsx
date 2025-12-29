import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Phone, Lock, Eye, EyeOff, Ban } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signOut, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [banInfo, setBanInfo] = useState<{ reason: string; banned_until: string | null } | null>(null);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10;
  };

  const checkBanStatus = async (userId: string): Promise<{ isBanned: boolean; reason?: string; bannedUntil?: string | null }> => {
    const { data, error } = await supabase
      .from("user_bans")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("banned_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { isBanned: false };
    }

    const ban = data[0];
    // Check if ban is still active (not expired)
    if (ban.banned_until && new Date(ban.banned_until) < new Date()) {
      return { isBanned: false };
    }

    return { isBanned: true, reason: ban.reason, bannedUntil: ban.banned_until };
  };

  const formatBanDuration = (bannedUntil: string | null) => {
    if (!bannedUntil) return "permanently";
    const until = new Date(bannedUntil);
    return `until ${until.toLocaleDateString()} at ${until.toLocaleTimeString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(formData.phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setBanInfo(null);

    const { error } = await signIn(formData.phone, formData.password);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid mobile number or password");
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
      return;
    }

    // Get the user and check ban status
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    
    if (loggedInUser) {
      const banStatus = await checkBanStatus(loggedInUser.id);
      
      if (banStatus.isBanned) {
        // Sign the user out immediately
        await signOut();
        setBanInfo({ reason: banStatus.reason || "Violation of terms", banned_until: banStatus.bannedUntil || null });
        setIsLoading(false);
        return;
      }
    }
    
    toast.success("Login successful! Welcome back.");
    navigate("/dashboard");
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-2xl text-white">B</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-500 mt-1">Enter your credentials to access your account</p>
            </div>

            {/* Ban Notice */}
            {banInfo && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <Ban className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Account Suspended</p>
                    <p className="text-sm text-red-700 mt-1">
                      Your account has been suspended {formatBanDuration(banInfo.banned_until)}.
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      <strong>Reason:</strong> {banInfo.reason}
                    </p>
                    <p className="text-xs text-red-500 mt-2">
                      Contact support if you believe this is a mistake.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Enter your mobile number"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Register now
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
