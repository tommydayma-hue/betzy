import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Loader2, RefreshCw, KeyRound, Phone, Mail, Clock, Eye, Ban, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BanInfo {
  reason: string;
  banned_at: string;
  banned_until: string | null;
  ban_id: string;
}

interface UserWithDetails {
  id: string;
  user_id: string;
  username: string | null;
  wallet_balance: number;
  created_at: string;
  updated_at: string | null;
  avatar_url: string | null;
  email: string;
  phone: string;
  last_sign_in: string | null;
  email_confirmed: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banInfo: BanInfo | null;
}

const AdminUsersContent = () => {
  const { isLoading } = useAdmin();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-users");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
    setLoading(false);
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    try {
      if (currentlyAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");

        if (error) throw error;
        toast.success("Admin role removed");
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });

        if (error) throw error;
        toast.success("Admin role added");
      }
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update role");
    }
  };

  const updateBalance = async (userId: string, amount: number) => {
    const { error } = await supabase
      .from("profiles")
      .update({ wallet_balance: amount })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update balance");
    } else {
      toast.success("Balance updated");
      fetchUsers();
    }
  };

  // Password reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // User details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserWithDetails | null>(null);

  // Ban dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banningUser, setBanningUser] = useState<UserWithDetails | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [isBanning, setIsBanning] = useState(false);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const openResetDialog = (user: UserWithDetails) => {
    setSelectedUser(user);
    setNewPassword(generateRandomPassword());
    setResetDialogOpen(true);
  };

  const openDetailsDialog = (user: UserWithDetails) => {
    setViewingUser(user);
    setDetailsDialogOpen(true);
  };

  const openBanDialog = (user: UserWithDetails) => {
    setBanningUser(user);
    setBanReason("");
    setBanDuration("permanent");
    setBanDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId: selectedUser.user_id, newPassword },
      });

      if (error) throw error;

      toast.success("Password reset successfully! Share the new password with the user.");
      setResetDialogOpen(false);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleBanUser = async () => {
    if (!banningUser || !banReason.trim()) {
      toast.error("Please provide a reason for the ban");
      return;
    }

    setIsBanning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let bannedUntil: string | null = null;
      if (banDuration !== "permanent") {
        const now = new Date();
        const hours = parseInt(banDuration);
        bannedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase.from("user_bans").insert({
        user_id: banningUser.user_id,
        reason: banReason.trim(),
        banned_until: bannedUntil,
        banned_by: user.id,
      });

      if (error) throw error;

      toast.success(`User ${banningUser.username || banningUser.phone} has been banned`);
      setBanDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast.error(error.message || "Failed to ban user");
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanUser = async (user: UserWithDetails) => {
    if (!user.banInfo?.ban_id) return;

    try {
      const { error } = await supabase
        .from("user_bans")
        .update({ is_active: false })
        .eq("id", user.banInfo.ban_id);

      if (error) throw error;

      toast.success(`User ${user.username || user.phone} has been unbanned`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user");
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast.success("Password copied to clipboard!");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.user_id?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.includes(search) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatBanDuration = (bannedUntil: string | null) => {
    if (!bannedUntil) return "Permanent";
    const until = new Date(bannedUntil);
    const now = new Date();
    const diffMs = until.getTime() - now.getTime();
    if (diffMs <= 0) return "Expired";
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h remaining`;
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d remaining`;
  };

  if (isLoading || loading) {
    return (
      <AdminLayout title="Users Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users Management">
      <Card variant="default" className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              All Users ({users.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Balance</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Login</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className={`border-b border-border/50 hover:bg-accent/30 transition-colors animate-fade-in ${user.isBanned ? 'bg-red-50/50' : ''}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.isBanned ? 'bg-red-100' : 'bg-gradient-to-br from-primary/30 to-primary/10'}`}>
                          <User className={`h-5 w-5 ${user.isBanned ? 'text-red-500' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{user.username || "No username"}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{user.phone || "N/A"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-display font-bold text-success">
                        ₹{Number(user.wallet_balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {user.isBanned ? (
                          <Badge className="bg-red-100 text-red-700 border border-red-200">
                            <Ban className="h-3 w-3 mr-1" />
                            Banned
                          </Badge>
                        ) : user.isAdmin ? (
                          <Badge className="bg-primary/20 text-primary border border-primary/30">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                        {user.isBanned && user.banInfo && (
                          <span className="text-xs text-red-600">
                            {formatBanDuration(user.banInfo.banned_until)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {user.last_sign_in 
                        ? new Date(user.last_sign_in).toLocaleDateString() 
                        : "Never"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailsDialog(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetDialog(user)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {user.isBanned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleUnbanUser(user)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => openBanDialog(user)}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Ban
                          </Button>
                        )}
                        <Button
                          variant={user.isAdmin ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleAdminRole(user.user_id, user.isAdmin)}
                        >
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Details
            </DialogTitle>
          </DialogHeader>
          
          {viewingUser && (
            <div className="space-y-4 py-4">
              {/* User Avatar & Name */}
              <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${viewingUser.isBanned ? 'bg-red-100' : 'bg-gradient-to-br from-primary/30 to-primary/10'}`}>
                  <User className={`h-8 w-8 ${viewingUser.isBanned ? 'text-red-500' : 'text-primary'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{viewingUser.username || "No username"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingUser.isBanned ? (
                      <Badge className="bg-red-100 text-red-700 border border-red-200">
                        <Ban className="h-3 w-3 mr-1" />
                        Banned
                      </Badge>
                    ) : viewingUser.isAdmin ? (
                      <Badge className="bg-primary/20 text-primary border border-primary/30">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                    {viewingUser.email_confirmed && (
                      <Badge variant="outline" className="text-green-600 border-green-300">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Ban Info */}
              {viewingUser.isBanned && viewingUser.banInfo && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800 mb-1">Ban Details</p>
                  <p className="text-sm text-red-700"><strong>Reason:</strong> {viewingUser.banInfo.reason}</p>
                  <p className="text-sm text-red-700">
                    <strong>Duration:</strong> {formatBanDuration(viewingUser.banInfo.banned_until)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Banned on: {new Date(viewingUser.banInfo.banned_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </div>
                  <p 
                    className="font-mono font-medium cursor-pointer hover:text-primary"
                    onClick={() => copyToClipboard(viewingUser.phone, "Phone")}
                  >
                    {viewingUser.phone || "N/A"}
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p 
                    className="font-mono text-sm font-medium cursor-pointer hover:text-primary truncate"
                    onClick={() => copyToClipboard(viewingUser.email, "Email")}
                  >
                    {viewingUser.email || "N/A"}
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-muted-foreground text-sm mb-1">Wallet Balance</div>
                  <p className="font-display font-bold text-xl text-success">
                    ₹{Number(viewingUser.wallet_balance).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-muted-foreground text-sm mb-1">User ID</div>
                  <p 
                    className="font-mono text-sm cursor-pointer hover:text-primary truncate"
                    onClick={() => copyToClipboard(viewingUser.user_id, "User ID")}
                  >
                    {viewingUser.user_id}
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Joined
                  </span>
                  <span className="text-sm">
                    {new Date(viewingUser.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Last Sign In</span>
                  <span className="text-sm">
                    {viewingUser.last_sign_in 
                      ? new Date(viewingUser.last_sign_in).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                {viewingUser.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Last Updated</span>
                    <span className="text-sm">
                      {new Date(viewingUser.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            {viewingUser && !viewingUser.isBanned && (
              <Button 
                variant="outline" 
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => {
                  setDetailsDialogOpen(false);
                  openBanDialog(viewingUser);
                }}
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban User
              </Button>
            )}
            {viewingUser && viewingUser.isBanned && (
              <Button 
                variant="outline" 
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => {
                  handleUnbanUser(viewingUser);
                  setDetailsDialogOpen(false);
                }}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Unban User
              </Button>
            )}
            {viewingUser && (
              <Button onClick={() => {
                setDetailsDialogOpen(false);
                openResetDialog(viewingUser);
              }}>
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Ban user: <strong>{banningUser?.username || banningUser?.phone || "Unknown"}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Ban Duration</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="6">6 Hours</SelectItem>
                  <SelectItem value="24">24 Hours (1 Day)</SelectItem>
                  <SelectItem value="72">72 Hours (3 Days)</SelectItem>
                  <SelectItem value="168">1 Week</SelectItem>
                  <SelectItem value="720">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Reason for Ban</label>
              <Textarea
                placeholder="Explain why this user is being banned..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will prevent the user from logging in until the ban expires or is lifted.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanUser} 
              disabled={isBanning || !banReason.trim()}
            >
              {isBanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Banning...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Reset password for: <strong>{selectedUser?.username || selectedUser?.phone || "Unknown"}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="font-mono"
                />
                <Button variant="outline" onClick={() => setNewPassword(generateRandomPassword())}>
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> After resetting, share this password with the user via WhatsApp or call.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={copyPassword}>
              Copy Password
            </Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword || !newPassword}>
              {isResettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const AdminUsers = () => (
  <AdminProvider>
    <AdminUsersContent />
  </AdminProvider>
);

export default AdminUsers;
