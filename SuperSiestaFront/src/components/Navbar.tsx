import { ShoppingCart, Menu, X, User, Globe, Check, Phone } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSettings } from "@/hooks/useSettings";
import { useSocialNetworks } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";
import { trackGAContactClick } from "@/services/analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { count, openCart } = useCart();
  const { user } = useAuth();
  const { t, lang, setLang, availableLanguages } = useLanguage();
  const { settings } = useSettings();
  const { socials } = useSocialNetworks();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { label: t.nav.home, href: "/" },
    { label: t.nav.shop, href: "/boutique" },
    { label: t.nav.showrooms, href: "/showrooms" },
    { label: t.nav.blog, href: "/blog" },
    { label: t.nav.about, href: "/a-propos" },
    { label: t.nav.contact, href: "/contact" },
  ];

  const currentLangObj = availableLanguages.find((l) => l.code === lang) || availableLanguages[0];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
      {/* Top Announcement Bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5 overflow-hidden relative flex items-center">
        <div className="whitespace-nowrap animate-marquee flex w-max">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="px-8">
              {settings.top_banner_text || t.nav.promo}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <button onClick={() => navigate("/")} aria-label="Accueil Super Siesta" className="flex min-h-11 items-center gap-2">
          <img 
            src="/images/logo.png" 
            alt="Siesta Officiel" 
            className="h-12 w-auto animate-float" 
          />
        </button>

        {/* Desktop Navigation Links */}
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} to={l.href} className="inline-flex min-h-11 items-center text-sm font-medium text-foreground hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-h-11 items-center gap-1.5 text-xs bg-muted hover:bg-accent px-2.5 py-1.5 rounded-full transition-colors font-bold text-foreground focus:outline-none">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{currentLangObj.flag} {currentLangObj.shortLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-background border border-border shadow-lg rounded-xl p-1 z-50">
              {availableLanguages.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                    lang === l.code ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </span>
                  {lang === l.code && <Check className="w-3.5 h-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {settings.contact_phone && (
            <>
              <a
                href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                onClick={() => trackGAContactClick("call", settings.contact_phone)}
                className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-2 py-1.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10 sm:gap-1.5 sm:px-2.5 sm:text-xs lg:hidden"
                dir="ltr"
                aria-label={`Appeler ${settings.contact_phone}`}
              >
                <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                {settings.contact_phone}
              </a>
              <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-sm font-bold text-primary lg:inline-flex" dir="ltr">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {settings.contact_phone}
              </span>
            </>
          )}

          {/* User Account / Login */}
          <Link 
            to={user ? "/mon-compte" : "/connexion"} 
            className="hidden sm:flex min-h-11 items-center gap-1.5 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <User className="w-3 h-3" aria-hidden="true" />
            {user ? t.nav.myAccount : t.nav.login}
          </Link>

          {/* Socials */}
          <div className="hidden lg:flex items-center gap-1.5">
            {socials.filter(s => s.is_active).slice(0, 3).map((s) => {
              const isWhatsapp = s.name.toLowerCase().includes('whatsapp') || s.icon?.lucide_name?.toLowerCase().includes('message');
              return (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.name} de Super Siesta (s'ouvre dans un nouvel onglet)`}
                  onClick={() => {
                    if (isWhatsapp) {
                      trackGAContactClick("whatsapp", s.name);
                    }
                  }}
                  title={s.name}
                  className="flex min-h-11 min-w-11 items-center justify-center bg-accent rounded-full transition-all hover:scale-110"
                  style={{ color: s.icon?.hex_color || 'currentColor' }}
                >
                  <LucideIcon name={s.icon?.lucide_name} label={s.name} className="w-4 h-4" aria-hidden="true" />
                </a>
              );
            })}
          </div>

          {/* Cart Trigger */}
          <button 
            onClick={openCart} 
            aria-label="Ouvrir le panier"
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            title={t.nav.cart}
          >
            <ShoppingCart className="w-5 h-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-muted"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="navigation-mobile"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <nav id="navigation-mobile" aria-label="Navigation mobile" className={`md:hidden border-t border-border bg-background px-4 py-4 flex-col gap-3 ${menuOpen ? "flex" : "hidden"}`}>
          {links.map((l) => (
            <Link 
              key={l.href} 
              to={l.href} 
              className="inline-flex min-h-11 items-center text-sm font-medium py-2 text-foreground hover:text-primary" 
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <Link 
              to={user ? "/mon-compte" : "/connexion"} 
              className="inline-flex min-h-11 items-center text-sm font-medium py-2 text-primary gap-2" 
              onClick={() => setMenuOpen(false)}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              {user ? t.nav.myAccount : t.nav.login}
            </Link>

            <div className="flex items-center gap-1">
              {availableLanguages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`min-h-11 min-w-11 px-2 py-1 text-xs rounded-md ${
                    lang === l.code ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-foreground"
                  }`}
                >
                  {l.shortLabel}
                </button>
              ))}
            </div>
          </div>
      </nav>
    </header>
  );
}
