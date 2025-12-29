import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, MessageSquare, Clock, CheckCircle, Send, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
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
}

const ISSUE_CATEGORIES = [
  { value: "password_reset", label: "Password Reset Request" },
  { value: "withdrawal", label: "Withdrawal Issues" },
  { value: "deposit", label: "Deposit Issues" },
  { value: "wallet", label: "Wallet Issues" },
  { value: "other", label: "OTHER ISSUES" },
  { value: "bug", label: "BUG OR SUGGESTIONS" },
];

const Support = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTickets(data);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("ticket_replies")
      .select("id, message, is_admin, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setReplies(data as Reply[]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    if (!category) {
      toast.error("Please select an issue category");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrl = null;

      if (attachment) {
        const fileExt = attachment.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(fileName, attachment);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        category,
        message,
        attachment_url: attachmentUrl,
      });

      if (error) throw error;

      toast.success("Ticket submitted successfully!");
      setCategory("");
      setMessage("");
      setAttachment(null);
      fetchTickets();
      setActiveTab("history");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
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
        is_admin: false,
      });

      if (error) throw error;

      setReplyMessage("");
      await fetchReplies(selectedTicket.id);
      toast.success("Reply sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-blue-100 text-blue-700",
      resolved: "bg-green-100 text-green-700",
      closed: "bg-gray-100 text-gray-700",
    };
    return styles[status as keyof typeof styles] || styles.open;
  };

  const getCategoryLabel = (value: string) => {
    return ISSUE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-white">
      <Header />

      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Help & Support</h1>
            <p className="text-gray-600">
              Got a problem? Our support team is ready to keep your game running smoothly
            </p>
          </div>

          {/* Back Button */}
          <Card className="bg-white shadow-sm border-gray-200 mb-6">
            <CardContent className="p-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="bg-gray-800 text-white hover:bg-gray-900 border-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <Button
              variant={activeTab === "new" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("new");
                setSelectedTicket(null);
              }}
              className={activeTab === "new" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
              className={activeTab === "history" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <Clock className="h-4 w-4 mr-2" />
              My Tickets ({tickets.length})
            </Button>
          </div>

          {activeTab === "new" && (
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-600 text-center mb-6 flex items-center justify-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Create Your New Tickets
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5 max-w-xl mx-auto">
                  <div>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 bg-white border-gray-300">
                        <SelectValue placeholder="Choose your issue" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Your Screenshot/Video/Mp3
                    </label>
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="attachment-upload"
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white"
                      >
                        <span className="text-sm text-gray-600 border border-gray-300 px-2 py-1 rounded">
                          Choose File
                        </span>
                        <span className="text-sm text-gray-500">
                          {attachment ? attachment.name : "Attachment"}
                        </span>
                      </label>
                      <input
                        id="attachment-upload"
                        type="file"
                        accept="image/*,video/*,audio/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <Textarea
                      placeholder="Enter your remarks!"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[120px] bg-white border-gray-300 resize-none"
                    />
                  </div>

                  <div className="text-center">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "history" && !selectedTicket && (
            <Card className="bg-white shadow-sm border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Your Support Tickets</h3>
                
                {tickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No tickets found. Create a new ticket to get help.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800">
                                {getCategoryLabel(ticket.category)}
                              </span>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusBadge(ticket.status))}>
                                {ticket.status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{ticket.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(ticket.created_at).toLocaleDateString()} at{" "}
                              {new Date(ticket.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          {ticket.attachment_url && (
                            <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "history" && selectedTicket && (
            <Card className="bg-white shadow-sm border-gray-200">
              <CardContent className="p-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTicket(null)}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to tickets
                </Button>

                {/* Ticket Info */}
                <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-gray-800">
                      {getCategoryLabel(selectedTicket.category)}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusBadge(selectedTicket.status))}>
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{selectedTicket.message}</p>
                  {selectedTicket.attachment_url && (
                    <a
                      href={selectedTicket.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      View Attachment
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Submitted: {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Replies */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {replies.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No replies yet. Waiting for support response...</p>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          "p-3 rounded-lg max-w-[80%]",
                          reply.is_admin
                            ? "bg-blue-100 text-blue-900 mr-auto"
                            : "bg-gray-100 text-gray-800 ml-auto"
                        )}
                      >
                        <p className="text-xs font-medium mb-1">
                          {reply.is_admin ? "Support Team" : "You"}
                        </p>
                        <p className="text-sm">{reply.message}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {new Date(reply.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input */}
                {selectedTicket.status !== "closed" && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Support;
