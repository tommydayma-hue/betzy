import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export const NotificationsModal = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
      // Check if there are notifications user hasn't seen
      const lastSeen = localStorage.getItem("lastSeenNotification");
      if (data.length > 0 && (!lastSeen || new Date(data[0].created_at) > new Date(lastSeen))) {
        setHasUnread(true);
      }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && notifications.length > 0) {
      // Mark as read
      localStorage.setItem("lastSeenNotification", notifications[0].created_at);
      setHasUnread(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button 
          className="relative p-2.5 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5 text-blue-600" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">Notifications</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No notifications at the moment</p>
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <div className="space-y-1">
                  {notification.title && (
                    <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                  )}
                  <p className="text-gray-700 leading-relaxed">{notification.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {index < notifications.length - 1 && <Separator className="mt-4" />}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
