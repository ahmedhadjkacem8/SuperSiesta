import { ReactNode, useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuthSecure";
import { LayoutDashboard, Package, Users, FileText, Receipt, Wallet, LogOut, PenSquare, Image, Newspaper, MapPin, ShoppingCart, SlidersHorizontal, Layers, Truck, Settings, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import AdminNotificationsPanel from "./AdminNotificationsPanel";
import logo from "@/assets/logo.png";

const navGroups = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    ]
  },
  {
    title: "Catalogue & Ventes",
    items: [
      { label: "Produits", path: "/admin/produits", icon: Package },
      { label: "Gammes", path: "/admin/gammes", icon: Layers },
      { label: "Commandes", path: "/admin/commandes", icon: ShoppingCart },
      { label: "Bons Livraison", path: "/admin/bon-livraison", icon: Truck },
      { label: "Devis", path: "/admin/devis", icon: FileText },
    ]
  },
  {
    title: "Support & Contacts",
    items: [
      { label: "Clients", path: "/admin/clients", icon: Users },
      { label: "Livreurs", path: "/admin/livreurs", icon: Users },
      { label: "Avis & Messages", path: "/admin/reviews", icon: PenSquare },
    ]
  },
  {
    title: "Autres Configurations",
    items: [
      { label: "Hero Slides", path: "/admin/hero-slides", icon: SlidersHorizontal },
      { label: "Blog", path: "/admin/blog", icon: Newspaper },
      { label: "Showrooms", path: "/admin/showrooms", icon: MapPin },
      { label: "À Propos", path: "/admin/a-propos", icon: Info },
      { label: "Paramétrages", path: "/admin/settings", icon: Settings },
    ]
  }
];

const allItems = navGroups.flatMap(group => group.items);

import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-zinc-950/50 font-sans">
      <aside className="w-[230px] bg-background border-r border-border/40 flex flex-col shrink-0 hidden md:flex overflow-visible shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-40">
        <div className="p-5 border-b border-border/40 flex items-center relative min-h-[85px]">
          <Link to="/admin" className="absolute inset-0 flex items-center justify-center group pointer-events-auto">
            <img src={logo} alt="Super Siesta Logo" className="w-20 h-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform" />
          </Link>
          <div className="ml-auto relative z-10 pointer-events-auto">
            <AdminNotificationsPanel />
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-0.5">
              <h4 className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2 first:mt-0">
                {group.title}
              </h4>
              {group.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-[1.01]"}`}>
                    <item.icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground/70"}`} />{item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-border/40 bg-muted/10">
          <p className="text-xs font-medium text-muted-foreground truncate mb-3 px-2">{user?.email}</p>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-xl"><LogOut className="w-4 h-4" /> Déconnexion</Button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border/40 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="w-7 h-auto object-contain drop-shadow-sm" />
          <span className="text-lg font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">SS</span>
        </Link>
        <div className="flex gap-1 overflow-x-auto">
          {allItems.map((item) => (
            <Link key={item.path} to={item.path} className={`p-2 rounded-xl transition-colors ${pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} title={item.label}>
              <item.icon className="w-4 h-4" />
            </Link>
          ))}
          <button onClick={handleSignOut} className="p-2 text-muted-foreground hover:text-destructive"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      <main className="flex-1 overflow-auto bg-muted/20 md:mt-0 mt-16 relative">
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
