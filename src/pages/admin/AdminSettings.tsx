import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, Bell, Globe, Loader2, Save, Upload, QrCode, Coins 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentInfo {
  upi_id: string;
  qr_code_url: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
}

interface SiteConfig {
  site_name: string;
  min_deposit: number;
  min_withdrawal: number;
  max_withdrawal: number;
  default_max_bet: number;
  telegram_link: string;
}

interface NotificationSettings {
  deposit_approved: boolean;
  withdrawal_approved: boolean;
  bet_won: boolean;
  new_match: boolean;
}

interface CoinflipConfig {
  win_percentage: number;
  enabled: boolean;
}

const AdminSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    upi_id: "",
    qr_code_url: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_holder_name: "",
  });

  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    site_name: "BetMaster",
    min_deposit: 100,
    min_withdrawal: 100,
    max_withdrawal: 50000,
    default_max_bet: 100000,
    telegram_link: "",
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    deposit_approved: true,
    withdrawal_approved: true,
    bet_won: true,
    new_match: true,
  });

  const [coinflipConfig, setCoinflipConfig] = useState<CoinflipConfig>({
    win_percentage: 50,
    enabled: true,
  });

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        navigate('/dashboard');
      } else if (data === true) {
        setIsAdmin(true);
      } else {
        navigate('/dashboard');
      }
      setCheckingAdmin(false);
    };

    checkAdmin();
  }, [user, authLoading, navigate]);

  // Fetch settings once admin is confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");

      if (error) throw error;

      data?.forEach((setting) => {
        switch (setting.key) {
          case "payment_info":
            setPaymentInfo(setting.value as unknown as PaymentInfo);
            break;
          case "site_config":
            setSiteConfig(setting.value as unknown as SiteConfig);
            break;
          case "notifications":
            setNotifications(setting.value as unknown as NotificationSettings);
            break;
          case "coinflip_config":
            setCoinflipConfig(setting.value as unknown as CoinflipConfig);
            break;
        }
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    }
    setLoading(false);
  };

  const uploadQrCode = async (file: File) => {
    setUploadingQr(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-code-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(filePath);

      setPaymentInfo(prev => ({ ...prev, qr_code_url: publicUrl }));
      toast.success("QR code uploaded");
    } catch (error: any) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingQr(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Upsert payment info
      await supabase
        .from("site_settings")
        .upsert({ 
          key: "payment_info", 
          value: JSON.parse(JSON.stringify(paymentInfo)),
          description: "Payment configuration for deposits"
        }, { onConflict: 'key' });

      // Upsert site config
      await supabase
        .from("site_settings")
        .upsert({ 
          key: "site_config", 
          value: JSON.parse(JSON.stringify(siteConfig)),
          description: "General site configuration"
        }, { onConflict: 'key' });

      // Upsert notifications
      await supabase
        .from("site_settings")
        .upsert({ 
          key: "notifications", 
          value: JSON.parse(JSON.stringify(notifications)),
          description: "Notification settings"
        }, { onConflict: 'key' });

      // Upsert coinflip config
      await supabase
        .from("site_settings")
        .upsert({ 
          key: "coinflip_config", 
          value: JSON.parse(JSON.stringify(coinflipConfig)),
          description: "Coin flip game configuration"
        }, { onConflict: 'key' });

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (authLoading || checkingAdmin || (isAdmin && loading)) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl space-y-6">
        {/* Payment Settings */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Configure payment details that will be shown to users for deposits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upi_id">UPI ID</Label>
                <Input
                  id="upi_id"
                  placeholder="yourupi@bank"
                  value={paymentInfo.upi_id}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, upi_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>QR Code</Label>
                <div className="flex items-center gap-3">
                  {paymentInfo.qr_code_url ? (
                    <img
                      src={paymentInfo.qr_code_url}
                      alt="QR Code"
                      className="w-16 h-16 object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingQr}
                  >
                    {uploadingQr ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload QR
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadQrCode(e.target.files[0])}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name</Label>
                <Input
                  id="account_holder_name"
                  placeholder="John Doe"
                  value={paymentInfo.account_holder_name}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, account_holder_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  placeholder="HDFC Bank"
                  value={paymentInfo.bank_name}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, bank_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  placeholder="1234567890"
                  value={paymentInfo.account_number}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, account_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  placeholder="HDFC0001234"
                  value={paymentInfo.ifsc_code}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, ifsc_code: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Configuration */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Site Configuration
            </CardTitle>
            <CardDescription>
              General settings for your betting platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={siteConfig.site_name}
                  onChange={(e) => setSiteConfig({ ...siteConfig, site_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_max_bet">Default Max Bet (₹)</Label>
                <Input
                  id="default_max_bet"
                  type="number"
                  value={siteConfig.default_max_bet}
                  onChange={(e) => setSiteConfig({ ...siteConfig, default_max_bet: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_link">Telegram Support Link</Label>
              <Input
                id="telegram_link"
                placeholder="https://t.me/yourusername"
                value={siteConfig.telegram_link}
                onChange={(e) => setSiteConfig({ ...siteConfig, telegram_link: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This link will be shown in the header for users to contact support via Telegram
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_deposit">Min Deposit (₹)</Label>
                <Input
                  id="min_deposit"
                  type="number"
                  value={siteConfig.min_deposit}
                  onChange={(e) => setSiteConfig({ ...siteConfig, min_deposit: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_withdrawal">Min Withdrawal (₹)</Label>
                <Input
                  id="min_withdrawal"
                  type="number"
                  value={siteConfig.min_withdrawal}
                  onChange={(e) => setSiteConfig({ ...siteConfig, min_withdrawal: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_withdrawal">Max Withdrawal (₹)</Label>
                <Input
                  id="max_withdrawal"
                  type="number"
                  value={siteConfig.max_withdrawal}
                  onChange={(e) => setSiteConfig({ ...siteConfig, max_withdrawal: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coin Flip Settings */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Coin Flip Settings
            </CardTitle>
            <CardDescription>
              Control the winning probability for coin flip game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20">
              <div>
                <p className="font-medium text-lg">Game Status</p>
                <p className="text-sm text-muted-foreground">Enable or disable the coin flip game for all users</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-sm font-medium",
                  coinflipConfig.enabled ? "text-success" : "text-destructive"
                )}>
                  {coinflipConfig.enabled ? "ENABLED" : "DISABLED"}
                </span>
                <Switch
                  checked={coinflipConfig.enabled}
                  onCheckedChange={(checked) => setCoinflipConfig({ ...coinflipConfig, enabled: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="win_percentage">Win Percentage</Label>
                <span className="text-2xl font-bold text-primary">{coinflipConfig.win_percentage}%</span>
              </div>
              <Slider
                id="win_percentage"
                value={[coinflipConfig.win_percentage]}
                onValueChange={(value) => setCoinflipConfig({ ...coinflipConfig, win_percentage: value[0] })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (Never wins)</span>
                <span>50% (Fair)</span>
                <span>100% (Always wins)</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                This controls the probability of users winning in coin flip. 
                Set to 50% for fair odds, lower for house advantage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Enable or disable user notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
              <div>
                <p className="font-medium">Deposit Approved</p>
                <p className="text-sm text-muted-foreground">Notify users when their deposit is approved</p>
              </div>
              <Switch
                checked={notifications.deposit_approved}
                onCheckedChange={(checked) => setNotifications({ ...notifications, deposit_approved: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
              <div>
                <p className="font-medium">Withdrawal Approved</p>
                <p className="text-sm text-muted-foreground">Notify users when their withdrawal is processed</p>
              </div>
              <Switch
                checked={notifications.withdrawal_approved}
                onCheckedChange={(checked) => setNotifications({ ...notifications, withdrawal_approved: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
              <div>
                <p className="font-medium">Bet Won</p>
                <p className="text-sm text-muted-foreground">Notify users when they win a bet</p>
              </div>
              <Switch
                checked={notifications.bet_won}
                onCheckedChange={(checked) => setNotifications({ ...notifications, bet_won: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
              <div>
                <p className="font-medium">New Match Available</p>
                <p className="text-sm text-muted-foreground">Notify users when a new match is open for betting</p>
              </div>
              <Switch
                checked={notifications.new_match}
                onCheckedChange={(checked) => setNotifications({ ...notifications, new_match: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
