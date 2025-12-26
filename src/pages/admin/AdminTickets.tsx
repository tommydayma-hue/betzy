import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Clock, CheckCircle, Send, Loader2, 
  Paperclip, ArrowLeft, User, RefreshCw, XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  user_id: string;
  category: string;
  message: string;
  attachment_url: string | null;
  status: string;
  created_at: string;
}

interface Reply {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_id: string;
}

const ISSUE_CATEGORIES: Record<string, string> = {
  withdrawal: "Withdrawal Issues",
  deposit: "Deposit Issues",
  wallet: "Wallet Issues",
  other: "OTHER ISSUES",
  bug: "BUG OR SUGGESTIONS",
};

const AdminTickets = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
    }
  }, [isAdmin, statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTickets(data);
    }
    setLoading(false);
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("ticket_replies")
      .select("id, message, is_admin, created_at, user_id")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setReplies(data as Reply[]);
    }
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim() || !user) return;

    setIsSendingReply(true);

    try {
      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: replyMessage,
        is_admin: true,
      });

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", selectedTicket.id);
        
        setSelectedTicket({ ...selectedTicket, status: "in_progress" });
      }

      setReplyMessage("");
      await fetchReplies(selectedTicket.id);
      toast.success("Reply sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      setSelectedTicket({ ...selectedTicket, status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      fetchTickets();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      open: { class: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
      in_progress: { class: "bg-blue-100 text-blue-700 border-blue-200", icon: RefreshCw },
      resolved: { class: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
      closed: { class: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle },
    };
    return config[status as keyof typeof config] || config.open;
  };

  const getTicketCounts = () => {
    return {
      all: tickets.length,
      open: tickets.filter(t => t.status === "open").length,
      in_progress: tickets.filter(t => t.status === "in_progress").length,
      resolved: tickets.filter(t => t.status === "resolved").length,
    };
  };

  if (authLoading || checkingAdmin) {
    return (
      <AdminLayout title="Support Tickets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const counts = getTicketCounts();

  return (
    <AdminLayout title="Support Tickets">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Tickets
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchTickets}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap mt-3">
                {["all", "open", "in_progress", "resolved"].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="text-xs"
                  >
                    {status === "all" ? "All" : status.replace("_", " ")}
                    <span className="ml-1 text-xs opacity-70">
                      ({counts[status as keyof typeof counts] || 0})
                    </span>
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tickets found</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => {
                    const statusConfig = getStatusBadge(ticket.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50",
                          selectedTicket?.id === ticket.id ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {ISSUE_CATEGORIES[ticket.category] || ticket.category}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{ticket.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className={cn("text-xs", statusConfig.class)}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details & Chat */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="h-full">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      {ISSUE_CATEGORIES[selectedTicket.category] || selectedTicket.category}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      User ID: {selectedTicket.user_id.slice(0, 8)}...
                    </p>
                  </div>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={handleUpdateStatus}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Original Message */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">User Message</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{selectedTicket.message}</p>
                  {selectedTicket.attachment_url && (
                    <a
                      href={selectedTicket.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      View Attachment
                    </a>
                  )}
                </div>

                {/* Replies */}
                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                  {replies.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No replies yet. Send a reply to help this user.
                    </p>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          "p-3 rounded-lg max-w-[80%]",
                          reply.is_admin
                            ? "bg-primary/10 text-foreground ml-auto"
                            : "bg-muted text-foreground mr-auto"
                        )}
                      >
                        <p className="text-xs font-medium mb-1">
                          {reply.is_admin ? "You (Admin)" : "User"}
                        </p>
                        <p className="text-sm">{reply.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(reply.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input */}
                {selectedTicket.status !== "closed" && (
                  <div className="flex gap-2 border-t pt-4">
                    <Textarea
                      placeholder="Type your reply to the user..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="self-end"
                    >
                      {isSendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-16">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
