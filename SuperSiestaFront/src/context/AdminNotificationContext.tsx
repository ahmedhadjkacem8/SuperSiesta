import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'client' | 'review' | 'system' | 'avis';
  color: 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray';
  duration: number;
  status: 'new' | 'viewed' | 'expired';
  path?: string;
  is_read: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
}

interface AdminNotificationContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  getColorClass: (color: string) => string;
  refresh: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export const AdminNotificationProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastCheck, setLastCheck] = useState<Record<string, string>>({
    order: localStorage.getItem("last_notified_order_id") || "",
    client: localStorage.getItem("last_notified_client_id") || "",
    review: localStorage.getItem("last_notified_review_id") || ""
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevUnreadCount = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);
  const mounted = useRef(false);

  const getColorClass = (color: string): string => {
    const colorClasses: Record<string, string> = {
      red: 'bg-red-100 border-red-400 text-red-800',
      green: 'bg-green-100 border-green-400 text-green-800',
      blue: 'bg-blue-100 border-blue-400 text-blue-800',
      yellow: 'bg-yellow-100 border-yellow-400 text-yellow-800',
      orange: 'bg-orange-100 border-orange-400 text-orange-800',
      purple: 'bg-purple-100 border-purple-400 text-purple-800',
      gray: 'bg-gray-100 border-gray-400 text-gray-800'
    };
    return colorClasses[color] || colorClasses.blue;
  };

  const fetchNotificationList = async () => {
    try {
      const response = await api.get<any>("/admin/notifications");
      let finalNotifications: AdminNotification[] = [];
      let finalUnreadCount = 0;

      if (Array.isArray(response)) {
        finalNotifications = response;
        finalUnreadCount = response.filter(n => !n.is_read).length;
      } else if (response && typeof response === 'object') {
        finalNotifications = response.data || [];
        finalUnreadCount = response.unreadCount ?? finalNotifications.filter(n => !n.is_read).length;
      }

      finalNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(finalNotifications);
      setUnreadCount(finalUnreadCount);
    } catch (error) {
      console.error("[AdminNotificationProvider] Error fetching notifications:", error);
    }
  };

  const updateFaviconBadge = (count: number) => {
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!favicon) return;

    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 64, 64);
      if (count > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(50, 14, 14, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(count > 9 ? '9+' : count.toString(), 50, 14);
      }
      favicon.href = canvas.toDataURL();
    };
    img.src = '/favicon.ico'; 
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
    console.log("[AdminNotificationProvider] Initial mounting");
    fetchNotificationList();
    
    if (!audioRef.current) {
      audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }

    const checkNewEvents = async () => {
       // Logic to check for new orders/clients/reviews
       // This stays the same but will update the context state
       try {
          const [ordersRes, clientsRes, reviewsRes] = await Promise.all([
            api.get<any>("/admin/orders?per_page=1").catch(() => null),
            api.get<any>("/clients?per_page=1").catch(() => null),
            api.get<any>("/published-reviews?per_page=1").catch(() => null)
          ]);

          const latestOrder = ordersRes?.data?.[0] || (Array.isArray(ordersRes) ? ordersRes[0] : null);
          const latestClient = Array.isArray(clientsRes) ? clientsRes[0] : (clientsRes?.data?.[0] || null);
          const latestReview = Array.isArray(reviewsRes) ? reviewsRes[0] : (reviewsRes?.data?.[0] || null);

          if (latestOrder && latestOrder.id && latestOrder.id !== localStorage.getItem("last_notified_order_id")) {
             await createNotification({ title: "Nouvelle Commande", message: `Commande #${latestOrder.order_number}`, type: 'order', path: "/admin/commandes" }, "order", latestOrder.id);
          }
          if (latestClient && latestClient.id && String(latestClient.id) !== localStorage.getItem("last_notified_client_id")) {
             await createNotification({ title: "Nouveau Client", message: `${latestClient.full_name || 'Client'}`, type: 'client', path: "/admin/clients" }, "client", String(latestClient.id));
          }
          if (latestReview && latestReview.id && String(latestReview.id) !== localStorage.getItem("last_notified_review_id")) {
             await createNotification({ title: "Nouvel Avis", message: `De ${latestReview.name}`, type: 'avis', path: "/admin/reviews" }, "review", String(latestReview.id));
          }
       } catch (e) {}
    };

    const createNotification = async (notifData: any, type: string, id: string) => {
        try {
            const res = await api.post<{ notification: AdminNotification }>("/admin/notifications", notifData);
            const newNotif = res.notification;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            localStorage.setItem(`last_notified_${type}_id`, id);
            audioRef.current?.play().catch(() => {});
            toast(newNotif.title, { description: newNotif.message });
        } catch (e) {}
    };

    const pollInterval = setInterval(checkNewEvents, 30000); // 30 seconds
    const refreshInterval = setInterval(fetchNotificationList, 60000); // 60 seconds

    return () => {
      clearInterval(pollInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Admin - Super Siesta` : "Admin - Super Siesta";
    updateFaviconBadge(unreadCount);
    if (!isInitialLoad.current && unreadCount > prevUnreadCount.current) {
      audioRef.current?.play().catch(() => {});
    }
    prevUnreadCount.current = unreadCount;
    isInitialLoad.current = false;
  }, [unreadCount]);

  const markAsRead = async (id: string) => {
    try {
      if (!id.startsWith('local-')) {
        await api.post(`/notifications/${id}/read`, {});
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/admin/notifications/mark-all-read", {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <AdminNotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, getColorClass, refresh: fetchNotificationList }}>
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationContext);
  if (!context) throw new Error("useAdminNotifications must be used within an AdminNotificationProvider");
  return context;
};
