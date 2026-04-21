import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShoppingCart, Users, PenSquare, CheckCheck, Clock, X } from "lucide-react";
import { useAdminNotifications, AdminNotification } from "@/hooks/useAdminNotifications";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function AdminNotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, cleanAll, getColorClass } = useAdminNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="w-4 h-4" />;
      case 'client': return <Users className="w-4 h-4" />;
      case 'review': return <PenSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'new': return 'Nouvelle';
      case 'viewed': return 'Vue';
      case 'expired': return 'Expirée';
      default: return status;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'order': return 'Commande';
      case 'client': return 'Client';
      case 'avis': return 'Avis';
      case 'review': return 'Avis';
      default: return type;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-muted transition-colors group"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-destructive animate-ring' : 'text-muted-foreground'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-3 w-[400px] bg-card/95 backdrop-blur-xl border border-border rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[999] overflow-hidden border-primary/10 shadow-primary/5"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">Notifications</h3>
                <p className="text-[10px] text-muted-foreground">{unreadCount} non lues</p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:underline uppercase"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Tout marquer comme lu
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={async () => { await cleanAll(); setIsOpen(false); }}
                    className="flex items-center gap-1.5 text-[10px] font-black text-destructive hover:underline uppercase"
                  >
                    <X className="w-3.5 h-3.5" /> Nettoyer tout
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune notification pour le moment</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((notif: AdminNotification) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-muted/50 transition-colors relative group/item ${
                        notif.status === 'new' ? 'border-l-4' : ''
                      } ${notif.status === 'expired' ? 'opacity-60' : ''}`}
                      style={notif.status === 'new' ? { borderLeftColor: getColorForBorder(notif.color) } : {}}
                    >
                      <div className="flex gap-3">
                        {/* Badge couleur */}
                        <div
                          className={`p-2 rounded-lg shrink-0 h-fit flex items-center justify-center ${getColorClass(notif.color)}`}
                        >
                          {getIcon(notif.type)}
                        </div>

                        {/* Contenu */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm leading-tight mb-1 ${notif.status === 'new' ? 'font-black' : 'font-medium'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {notif.message}
                              </p>
                            </div>
                          </div>

                          {/* Métadonnées */}
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px]">
                                {getTypeLabel(notif.type)}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={`text-[9px] font-medium ${
                                  notif.status === 'new' ? 'bg-blue-200 text-blue-800' :
                                  notif.status === 'viewed' ? 'bg-gray-200 text-gray-800' :
                                  'bg-amber-200 text-amber-800'
                                }`}
                              >
                                {getStatusLabel(notif.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        {notif.status === 'new' && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                          >
                            <CheckCheck className="w-4 h-4 text-primary" />
                          </button>
                        )}
                      </div>

                      {/* Barre de progression d'expiration */}
                      {notif.expires_at && notif.status !== 'expired' && (
                        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getProgressBarColor(notif.color)}`}
                            style={{
                              width: `${getExpirationProgress(notif.expires_at)}%`,
                              transition: 'width 0.5s linear'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-muted/20 border-t border-border text-center">
              <Link 
                to="/admin/commandes" 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-tighter"
              >
                Voir toutes les activités
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Fonctions utilitaires
function getColorForBorder(color: string): string {
  const colors: Record<string, string> = {
    'red': '#dc2626',
    'green': '#16a34a',
    'blue': '#2563eb',
    'yellow': '#ca8a04',
    'orange': '#ea580c',
    'purple': '#9333ea',
    'gray': '#6b7280'
  };
  return colors[color] || '#2563eb';
}

function getProgressBarColor(color: string): string {
  const colors: Record<string, string> = {
    'red': 'bg-red-400',
    'green': 'bg-green-400',
    'blue': 'bg-blue-400',
    'yellow': 'bg-yellow-400',
    'orange': 'bg-orange-400',
    'purple': 'bg-purple-400',
    'gray': 'bg-gray-400'
  };
  return colors[color] || 'bg-blue-400';
}

function getExpirationProgress(expiresAt: string): number {
  try {
    const expiryTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const createdTime = expiryTime - (8 * 60 * 1000); // Supposer 8 minutes de durée
    
    const progress = ((now - createdTime) / (expiryTime - createdTime)) * 100;
    return Math.max(0, Math.min(100, progress));
  } catch {
    return 100;
  }
}

