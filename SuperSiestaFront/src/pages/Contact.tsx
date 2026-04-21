import { useEffect, useState } from "react";
import { Phone, Mail, MapPin, Clock, Loader2, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { useSettings } from "@/hooks/useSettings";
import { useSocialNetworks } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";
import { useAuth } from "@/hooks/useAuthSecure";
import CachedImage from "@/components/CachedImage";

interface Showroom {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  opening_days: { day: string; open: string; close: string }[] | null;
  map_url: string | null;
  image_url: string | null;
  images: string[] | null;
}

export default function Contact() {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [form, setForm] = useState({ 
    name: user?.name || "", 
    email: user?.email || "", 
    phone: user?.profile?.phone || "", 
    city: "",
    message: "" 
  });
  const [rating, setRating] = useState(5);
  const [sending, setSending] = useState(false);
  const { settings } = useSettings();
  const { socials } = useSocialNetworks();

  const TUNIS_CITIES = [
    "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef", 
    "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Sousse", "Monastir", "Mahdia", "Sfax", "Gafsa", 
    "Tozeur", "Kebili", "Gabès", "Médenine", "Tataouine"
  ];

  useEffect(() => {
    if (user) {
      setForm(prev => ({ 
        ...prev, 
        name: user.name || prev.name, 
        email: user.email || prev.email, 
        phone: user.profile?.phone || prev.phone 
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rooms = await api.get<Showroom[]>("/showrooms");
        setShowrooms(rooms || []);
      } catch (err) {
        console.error("error fetching showrooms");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/reviews", { ...form, rating });
      toast.success("Message envoyé ! Merci pour votre avis.");
      setForm(prev => ({ ...prev, message: "", city: "" }));
      setRating(5);
    } catch {
      toast.error("Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      {/* Hero */}
      <section className="bg-accent py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Contact</span>
          <h1 className="text-4xl font-black mt-2 mb-4">Contactez-nous</h1>
          <p className="text-muted-foreground">Une question ? Visitez l'un de nos showrooms ou envoyez-nous un message.</p>
        </div>
      </section>

      {/* Contact form + info */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <h2 className="text-2xl font-black mb-6">Envoyez-nous un message</h2>
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-sm font-bold mb-1 block">Nom complet</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-bold mb-1 block">Téléphone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-1 block">Ville</label>
                <select 
                  value={form.city} 
                  onChange={(e) => setForm({ ...form, city: e.target.value })} 
                  required
                  className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sélectionnez votre ville</option>
                  {TUNIS_CITIES.sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-bold mb-2 block">Votre Note</label>
                <div className="flex gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-7 h-7 transition-colors ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                      />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground italic">Votre note nous aide à améliorer nos services.</p>
              </div>

              <div>
                <label className="text-sm font-bold mb-1 block">Message</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={5} className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer
              </button>
            </form>
          </div>

          {/* Info */}
          <div>
            <h2 className="text-2xl font-black mb-6">Informations</h2>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"><Phone className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-bold">Téléphone</p><p className="text-sm text-muted-foreground">{settings.contact_phone || "+216 71 000 000"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"><Mail className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-bold">Email</p><p className="text-sm text-muted-foreground">{settings.contact_email || "contact@supersiesta.tn"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-bold">Horaires</p><p className="text-sm text-muted-foreground">{settings.contact_hours || "Lun-Sam 9h-19h"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-bold">Siège</p><p className="text-sm text-muted-foreground">{settings.contact_address || "Tunis, Tunisie"}</p></div>
              </div>
            </div>

            {/* Social */}
            <div className="flex flex-wrap gap-3">
              {socials.filter(s => s.is_active).map((s) => (
                <a 
                  key={s.id} 
                  href={s.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-accent transition-all hover:scale-105 font-bold text-sm"
                >
                  <div style={{ color: s.icon.hex_color || 'var(--primary)' }}>
                    <LucideIcon name={s.icon.lucide_name} label={s.name} className="w-5 h-5 transition-colors" />
                  </div>
                  <span>{s.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showrooms */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Showrooms</span>
            <h2 className="text-3xl font-black mt-2">Nos Points de Vente</h2>
            <p className="text-muted-foreground text-sm mt-2">Venez essayer nos matelas dans l'un de nos showrooms</p>
          </div>

          {loading ? (
            <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {showrooms.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
                  <div className="relative w-full h-40 bg-muted rounded-xl overflow-hidden mb-4 group/img">
                    {s.image_url ? (
                      <CachedImage src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-primary/20" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.name}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary flex-shrink-0" />{s.address}, {s.city}</p>
                    {s.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary flex-shrink-0" />{s.phone}</p>}
                  </div>
                  {s.opening_days && s.opening_days.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="flex items-center gap-2 text-sm font-bold mb-2"><Clock className="w-4 h-4 text-primary" /> Horaires</p>
                      <div className="space-y-1">
                        {s.opening_days.map((d, i) => (
                          <div key={i} className="flex justify-between text-xs text-muted-foreground">
                            <span>{d.day}</span>
                            <span>{d.open} - {d.close}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {s.map_url && (
                    <div className="mt-4 rounded-xl overflow-hidden aspect-video bg-muted border border-border">
                      <iframe 
                        src={s.map_url} 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
