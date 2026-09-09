import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/hooks/useSettings";
import { useSocialNetworks } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";

export default function Footer() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { socials } = useSocialNetworks();

  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <img src="/images/logo.png" alt="Super Siesta" className="h-10 w-auto" />
          </div>
          <p className="text-sm text-background/70 leading-relaxed">
            {settings.footer_description || `${t.footer.tagline} ${t.footer.taglineSub}`}
          </p>
          <div className="flex gap-3 mt-4">
            {socials.filter(s => s.is_active).map((s) => (
              <a 
                key={s.id} 
                href={s.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 bg-background/10 rounded-xl transition-all hover:scale-110"
                style={{ color: s.icon?.hex_color || 'currentColor' }}
              >
                <LucideIcon name={s.icon?.lucide_name} label={s.name} className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-background">{t.footer.shop}</h3>
          <ul className="space-y-2 text-sm text-background/70">
            {[
              { label: t.nav.home, href: "/" },
              { label: t.nav.shop, href: "/boutique" },
              { label: t.nav.showrooms, href: "/showrooms" },
              { label: t.nav.blog, href: "/blog" },
              { label: t.nav.about, href: "/a-propos" },
              { label: t.nav.contact, href: "/contact" },
            ].map((l) => (
              <li key={l.href}><Link to={l.href} className="hover:text-primary transition-colors">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-background">{t.nav.myAccount}</h3>
          <ul className="space-y-2 text-sm text-background/70">
            {[
              { label: t.nav.login, href: "/connexion" },
              { label: t.nav.register, href: "/register" },
              { label: t.account.orders, href: "/mon-compte" },
              { label: t.cart.myCart, href: "#", onClick: (e: any) => { e.preventDefault(); (window as any).dispatchEvent(new CustomEvent('open-cart')); } },
            ].map((l) => (
              <li key={l.label}>
                <Link 
                  to={l.href} 
                  onClick={l.onClick}
                  className="hover:text-primary transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-background">{t.footer.contact}</h3>
          <ul className="space-y-3 text-sm text-background/70">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span dir="ltr">{settings.contact_phone || "+216 71 000 000"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <span dir="ltr">{settings.contact_email || "contact@supersiesta.tn"}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{settings.contact_address || "Tunis, Tunisie"}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10 py-5 text-center text-xs text-background/40">
        © {new Date().getFullYear()} {t.footer.copyright}
      </div>
    </footer>
  );
}
