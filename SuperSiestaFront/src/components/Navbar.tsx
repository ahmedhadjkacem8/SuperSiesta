import { ShoppingCart, Phone, Menu, X, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSettings } from "@/hooks/useSettings";
import { useSocialNetworks } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";

export default function Navbar() {
  const { count, openCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { socials } = useSocialNetworks();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { label: "Accueil", href: "/" },
    { label: "Boutique", href: "/boutique" },
    { label: "Showrooms", href: "/showrooms" },
    { label: "Blog", href: "/blog" },
    { label: "À Propos", href: "/a-propos" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
      <div className="bg-primary text-primary-foreground text-xs text-center py-1.5 px-4">
        {settings.top_banner_text || "🚚 Livraison gratuite partout en Tunisie | 📞 71 000 000 | Paiement à la livraison"}
      </div>

      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Siesta Officiel" className="h-12 w-auto" />
        </button>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.label} to={l.href} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to={user ? "/mon-compte" : "/connexion"} className="hidden sm:flex items-center gap-1.5 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
            <User className="w-3 h-3" />
            {user ? "Mon Compte" : "Connexion"}
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            {socials.filter(s => s.is_active).map((s) => {
              // Ensure whatsapp link is correctly formatted if it's just a number
              let url = s.url;
              if (s.name.toLowerCase() === 'whatsapp' && !url.startsWith('http')) {
                url = `https://wa.me/${url.replace(/\s+/g, '')}`;
              }
              
              return (
                <a 
                  key={s.id} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title={s.name}
                  className="w-8 h-8 flex items-center justify-center bg-accent rounded-full transition-all hover:scale-110"
                  style={{ color: s.icon.hex_color || 'currentColor' }}
                >
                  <LucideIcon name={s.icon.lucide_name} label={s.name} className="w-4 h-4" />
                </a>
              );
            })}
          </div>

          <button onClick={openCart} className="relative p-2 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{count}</span>}
          </button>

          <button className="md:hidden p-2 rounded-xl bg-muted" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link key={l.label} to={l.href} className="text-sm font-medium py-2 text-foreground hover:text-primary" onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
          <Link to={user ? "/mon-compte" : "/connexion"} className="text-sm font-medium py-2 text-primary" onClick={() => setMenuOpen(false)}>
            {user ? "Mon Compte" : "Connexion"}
          </Link>
        </div>
      )}
    </header>
  );
}
