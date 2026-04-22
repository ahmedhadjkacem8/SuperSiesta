import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
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
  cleanAll: () => Promise<void>;
  getColorClass: (color: string) => string;
  refresh: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

// Synchronize across tabs using BroadcastChannel
const syncChannel = typeof window !== 'undefined' ? new BroadcastChannel('admin_notifications_sync') : null;

/**
 * AdminNotificationProvider - Optimized & Synchronized Notification System
 *
 * Features:
 * - Tab Synchronization: Actions in one tab (mark as read, clean all) are reflected in others via BroadcastChannel.
 * - Backend Integration: Backend handles notification creation.
 * - Precision: New notification detection via ID tracking.
 */
export const AdminNotificationProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);
  const mounted = useRef(false);

  const getColorClass = (color: string): string => {
    const colorClasses: Record<string, string> = {
      red:    'bg-red-100 border-red-400 text-red-800',
      green:  'bg-green-100 border-green-400 text-green-800',
      blue:   'bg-blue-100 border-blue-400 text-blue-800',
      yellow: 'bg-yellow-100 border-yellow-400 text-yellow-800',
      orange: 'bg-orange-100 border-orange-400 text-orange-800',
      purple: 'bg-purple-100 border-purple-400 text-purple-800',
      gray:   'bg-gray-100 border-gray-400 text-gray-800',
    };
    return colorClasses[color] || colorClasses.blue;
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

  const fetchNotificationList = useCallback(async (silent = false) => {
    try {
      const response = await api.get<any>("/admin/notifications");

      let fetched: AdminNotification[] = [];
      if (Array.isArray(response)) {
        fetched = response;
      } else if (response && typeof response === 'object') {
        fetched = response.data || [];
      }

      fetched = fetched
        .filter(n => n.status !== 'expired')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (!isInitialLoad.current && !silent) {
        const newOnes = fetched.filter(n => !n.is_read && !knownIds.current.has(n.id));
        if (newOnes.length > 0) {
          audioRef.current?.play().catch(() => {});
          newOnes.slice(0, 3).forEach(notif => {
            const toastType = notif.type === 'order' ? toast.success : toast.info;
            toastType(notif.title, {
              description: notif.message,
              duration: 6000,
              action: notif.path ? {
                label: "Voir",
                onClick: () => {
                  markAsRead(notif.id);
                  navigate(notif.path!);
                },
              } : undefined,
            });
          });
        }
      }

      fetched.forEach(n => knownIds.current.add(n.id));

      const newUnreadCount = fetched.filter(n => !n.is_read).length;
      setNotifications(fetched);
      setUnreadCount(newUnreadCount);
      isInitialLoad.current = false;
    } catch (error) {
      console.error("[AdminNotifications] Fetch error:", error);
    }
  }, [navigate]);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, status: 'viewed' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      syncChannel?.postMessage({ type: 'MARK_READ', id });
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/admin/notifications/mark-all-read", {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, status: 'viewed' })));
      setUnreadCount(0);
      syncChannel?.postMessage({ type: 'MARK_ALL_READ' });
    } catch (e) {}
  };

  const cleanAll = async () => {
    try {
      await api.post("/admin/notifications/clean-all", {});
      setNotifications([]);
      setUnreadCount(0);
      knownIds.current.clear();
      syncChannel?.postMessage({ type: 'CLEAN_ALL' });
    } catch (e) {}
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audioRef.current.volume = 0.6;

    fetchNotificationList();

    const interval = setInterval(() => fetchNotificationList(true), 20000);

    // Listen for sync events from other tabs
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        const { type, id } = event.data;
        switch (type) {
          case 'MARK_READ':
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, status: 'viewed' } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            break;
          case 'MARK_ALL_READ':
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true, status: 'viewed' })));
            setUnreadCount(0);
            break;
          case 'CLEAN_ALL':
            setNotifications([]);
            setUnreadCount(0);
            knownIds.current.clear();
            break;
          case 'NEW_NOTIFICATION':
            fetchNotificationList();
            break;
        }
      };
    }

    return () => {
      clearInterval(interval);
      // We don't close the channel here because it's global, 
      // but we could remove the listener if needed.
    };
  }, [fetchNotificationList]);

  useEffect(() => {
    document.title = unreadCount > 0
      ? `(${unreadCount}) Admin — Super Siesta`
      : "Admin — Super Siesta";
    updateFaviconBadge(unreadCount);
  }, [unreadCount]);

  return (
    <AdminNotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, cleanAll, getColorClass, refresh: fetchNotificationList }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationContext);
  if (!context) throw new Error("useAdminNotifications must be used within an AdminNotificationProvider");
  return context;
};
