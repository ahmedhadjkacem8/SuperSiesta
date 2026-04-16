import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { useSocialNetworks } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";

export default function Footer() {
  const { settings } = useSettings();
  const { socials } = useSocialNetworks();

  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-black text-sm">SS</span>
            </div>
            <div>
              <div className="font-black text-sm text-background leading-tight">SUPER SIESTA</div>
              <div className="text-[10px] text-background/60 tracking-widest">OFFICIEL</div>
            </div>
          </div>
          <p className="text-sm text-background/70 leading-relaxed">
            {settings.footer_description || "Matelas N°1 en Tunisie depuis 1993. Qualité, confort et hygiène pour votre sommeil."}
          </p>
          <div className="flex gap-3 mt-4">
            {socials.filter(s => s.is_active).map((s) => {
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
                  className="p-2 bg-background/10 rounded-xl transition-all hover:scale-110"
                  style={{ color: s.icon.hex_color || 'currentColor' }}
                >
                  <LucideIcon name={s.icon.lucide_name} label={s.name} className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-background">Boutique</h3>
          <ul className="space-y-2 text-sm text-background/70">
            {["Collections", "Best Sellers", "Promotions", "Nouveautés"].map((l) => (
              <li key={l}><Link to="/boutique" className="hover:text-primary transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-background">Informations</h3>
          <ul className="space-y-2 text-sm text-background/70">
            {[
              { label: "À Propos", href: "/a-propos" },
              { label: "Blog & Conseils", href: "/blog" },
              { label: "Contact", href: "/contact" },
              { label: "Mon Compte", href: "/connexion" },
            ].map((l) => (
              <li key={l.label}><Link to={l.href} className="hover:text-primary transition-colors">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-background">Contact</h3>
          <ul className="space-y-3 text-sm text-background/70">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{settings.contact_phone || "+216 71 000 000"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{settings.contact_email || "contact@supersiesta.tn"}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{settings.contact_address || "Tunis, Tunisie"}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10 py-5 text-center text-xs text-background/40">
        © {new Date().getFullYear()} Super Siesta Officiel. Tous droits réservés.
      </div>
    </footer>
  );
}
