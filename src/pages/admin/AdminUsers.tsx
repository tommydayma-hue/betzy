import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Loader2, RefreshCw, KeyRound, Phone, Mail, Clock, Eye } from "lucide-react";
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Login</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
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
                      {user.isAdmin ? (
                        <Badge className="bg-primary/20 text-primary border border-primary/30">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newBalance = prompt("Enter new balance:", user.wallet_balance.toString());
                            if (newBalance) updateBalance(user.user_id, parseFloat(newBalance));
                          }}
                        >
                          Edit Balance
                        </Button>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{viewingUser.username || "No username"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingUser.isAdmin ? (
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
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
