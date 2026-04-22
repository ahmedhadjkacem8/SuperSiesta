import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { useFreegiftsByProduct } from "@/hooks/useFreegifts";
import { Check, ChevronLeft, Package, Phone, MapPin, User, Loader2, Navigation, Gift, Mail, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatPrice } from "@/lib/utils";
import { getImageUrl } from "@/utils/imageUtils";

const villes = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

function generateOrderNumber() {
  const d = new Date();
  return `CMD-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

export default function Commander() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState({ 
    full_name: "", 
    email: "", 
    telephone: "", 
    telephone2: "", 
    adresse: "", 
    ville: "", 
    notes: "", 
    createAccount: false, 
    password: "", 
    latitude: null as number | null, 
    longitude: null as number | null 
  });
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [useSaved, setUseSaved] = useState(false);

  // Auto-fill from profile when logged in
  useEffect(() => {
    if (!user) return;
    api.get<any>("/user/profile").then((profile) => {
      if (!profile) return;
      
      setForm((prev) => ({
        ...prev,
        full_name: profile.full_name || prev.full_name,
        email: profile.email || prev.email,
        telephone: profile.phone || prev.telephone,
        adresse: profile.address || prev.adresse,
        ville: profile.city || prev.ville,
      }));
      setProfileLoaded(true);
      if (profile.full_name || profile.phone || profile.address || profile.email) {
        setUseSaved(true);
      }
    }).catch(() => {});
  }, [user]);



  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg font-medium mb-4">Votre panier est vide.</p>
          <button onClick={() => navigate("/boutique")} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors">Voir nos produits</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-10 h-10 text-primary" /></div>
          <h1 className="text-3xl font-black mb-3">Commande confirmée !</h1>
          <p className="text-muted-foreground mb-2">Merci <strong>{form.full_name}</strong> pour votre commande !</p>
          <p className="text-muted-foreground mb-6">Notre équipe vous contactera au <strong>{form.telephone}</strong> {form.telephone2 ? `ou au ${form.telephone2}` : ""} pour confirmer la livraison.</p>
          <div className="bg-accent rounded-2xl p-4 mb-6 text-sm text-accent-foreground">✅ Paiement à la livraison — Livraison gratuite</div>
          {user && (
            <button onClick={() => navigate("/mon-compte")} className="bg-secondary text-secondary-foreground font-bold px-7 py-3 rounded-2xl hover:bg-secondary/80 transition-colors mr-3 mb-3">Voir mes commandes</button>
          )}
          <button onClick={() => navigate("/")} className="bg-primary text-primary-foreground font-bold px-7 py-3.5 rounded-2xl hover:bg-primary/90 transition-colors">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Nom complet requis";
    
    if (form.createAccount && (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))) {
      e.email = "Email requis pour créer un compte";
    } else if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Email invalide";
    }
    
    if (!form.telephone.trim() || !/^\+?[\d\s]{8,}$/.test(form.telephone)) e.telephone = "Numéro de téléphone requis (invalide)";
    if (!form.ville) e.ville = "Ville requise";
    
    if (form.createAccount && (!form.password || form.password.length < 8)) e.password = "Le mot de passe doit faire au moins 8 caractères";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      
      // Automatically include all free gifts from items
      const allGifts: any[] = [];
      const giftIds = new Set<string | number>();

      items.forEach(item => {
        const productGifts = (item.product as any).freeGifts || [];
        productGifts.forEach((gift: any) => {
          if (!giftIds.has(gift.id)) {
            allGifts.push({
              free_gift_id: gift.id,
              quantity: 1 
            });
            giftIds.add(gift.id);
          }
        });
      });

      const payload: any = {
        order_number: orderNumber,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.telephone,
        phone2: form.telephone2 || null,
        address: form.adresse || null,
        city: form.ville,
        latitude: form.latitude,
        longitude: form.longitude,
        notes: form.notes || null,
        subtotal: total,
        total: total,
        create_account: form.createAccount,
        password: form.password,
        items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image,
          size_label: item.size.label,
          unit_price: item.size.price,
          quantity: item.quantity,
          total: item.size.price * item.quantity,
        })),
        free_gifts: allGifts.length > 0 ? allGifts : undefined
      };

      const response = await api.post<any>("/orders", payload);
      
      if (response.token) {
        localStorage.setItem("auth_token", response.token);
      }
      setSubmitted(true);
      clearCart();
    } catch (err: any) {
      toast.error("Erreur lors de la commande: " + (err.message || "Réessayez"));
    }
    setSubmitting(false);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        toast.success("Position récupérée !");
        setLocating(false);
      },
      (err) => {
        toast.error("Impossible de récupérer votre position : " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const field = (name: keyof typeof form, label: string, icon: React.ReactNode, props?: React.InputHTMLAttributes<HTMLInputElement>, required = false) => (
    <div>
      <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
        {label} 
        {required && <span className="text-destructive font-black text-lg leading-none" title="Champ obligatoire">*</span>}
      </label>
      <div className="relative group">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${errors[name] ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"}`}>{icon}</div>
        <input 
          {...props} 
          value={form[name] as string} 
          onChange={(e) => { setForm({ ...form, [name]: e.target.value }); if (errors[name]) setErrors({ ...errors, [name]: "" }); }} 
          className={`w-full pl-9 pr-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-all duration-200 bg-background ${
            errors[name] 
              ? "border-destructive/50 bg-destructive/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]" 
              : "border-border hover:border-primary/30 focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary-rgb),0.1)] shadow-sm"
          } ${required && !form[name] ? "border-l-4 border-l-primary/40" : ""}`} 
        />
        {required && !form[name] && !errors[name] && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Requis</span>
          </div>
        )}
      </div>
      {errors[name] && <p className="text-[11px] font-bold text-destructive mt-1.5 animate-in slide-in-from-top-1">{errors[name]}</p>}
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"><ChevronLeft className="w-4 h-4" />Retour</button>
      <h1 className="text-3xl font-black mb-8">Finaliser la commande</h1>

      {/* Saved info banner */}
      {user && useSaved && profileLoaded && (
        <div className="bg-accent border border-primary/20 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-accent-foreground">Informations pré-remplies depuis votre compte</p>
            <p className="text-xs text-muted-foreground">Vérifiez et modifiez si nécessaire avant de confirmer.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-primary"><User className="w-5 h-5" />Informations personnelles</h2>
            <div className="space-y-4">
              {field("full_name", "Nom & Prénom", <User className="w-4 h-4" />, { placeholder: "Entrez votre nom complet" }, true)}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field("telephone", "Téléphone", <Phone className="w-4 h-4" />, { placeholder: "XX XXX XXX", type: "tel" }, true)}
                {field("telephone2", "2ème Téléphone (Optionnel)", <Phone className="w-4 h-4" />, { placeholder: "XX XXX XXX", type: "tel" }, false)}
              </div>
              <div>{field("email", "E-mail", <Mail className="w-4 h-4" />, { placeholder: "votre@email.com (Optionnel)", type: "email" }, false)}</div>
            </div>
            
            {!user && (
              <div className="mt-6 pt-6 border-t border-border">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${form.createAccount ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}>
                    {form.createAccount && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
                  <div>
                    <p className="text-sm font-bold">Créer un compte ?</p>
                    <p className="text-xs text-muted-foreground">Pour suivre votre commande et commander plus vite la prochaine fois.</p>
                  </div>
                </label>
                
                {form.createAccount && (
                  <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                    {field("password", "Choisissez un mot de passe", <Check className="w-4 h-4" />, { placeholder: "Min. 8 caractères", type: "password" }, true)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg flex items-center gap-2 text-primary"><MapPin className="w-5 h-5" />Livraison</h2>
              {/* 
              <button 
                type="button" 
                onClick={handleGetLocation} 
                disabled={locating}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${form.latitude ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"}`}
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                {form.latitude ? "Position enregistrée" : "Ma position actuelle"}
              </button>
              */}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  Ville 
                  <span className="text-destructive font-black text-lg leading-none">*</span>
                </label>
                <div className="relative group">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${errors.ville ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"}`}><MapPin className="w-4 h-4" /></div>
                  <select 
                    value={form.ville} 
                    onChange={(e) => { setForm({ ...form, ville: e.target.value }); if (errors.ville) setErrors({ ...errors, ville: "" }); }} 
                    className={`w-full pl-9 pr-10 py-3 border-2 rounded-xl text-sm focus:outline-none transition-all duration-200 bg-background appearance-none ${
                      errors.ville 
                        ? "border-destructive/50 bg-destructive/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]" 
                        : "border-border hover:border-primary/30 focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary-rgb),0.1)] shadow-sm"
                    } ${!form.ville ? "border-l-4 border-l-primary/40" : ""}`}
                  >
                    <option value="">Sélectionner votre ville...</option>
                    {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  {!form.ville && !errors.ville && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Requis</span>
                    </div>
                  )}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l pl-2 border-border">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {errors.ville && <p className="text-[11px] font-bold text-destructive mt-1.5 animate-in slide-in-from-top-1">{errors.ville}</p>}
              </div>

              {field("adresse", "Adresse précise", <MapPin className="w-4 h-4" />, { placeholder: "Rue, immeuble, appartement... (Optionnel)" }, false)}

              <div>
                <label className="text-sm font-medium block mb-1.5">Notes pour le livreur (Optionnel)</label>
                <textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  placeholder="Instructions spéciales (ex: code porte, repère...)" 
                  rows={3} 
                  className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm focus:outline-none focus:border-primary hover:border-primary/30 transition-all bg-background resize-none shadow-sm" 
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-primary">Mode de paiement</h2>
            <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-4 border-2 border-primary/20">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm"><Check className="w-4 h-4 text-primary-foreground" /></div>
              <div>
                <p className="font-bold text-sm">Paiement à la livraison</p>
                <p className="text-xs text-muted-foreground">Réglez en espèces ou par chèque lors de la réception.</p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-all text-lg shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-[0.98]">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirmation...</> : "Confirmer la commande →"}
          </button>
        </form>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
            <h2 className="font-bold text-lg mb-5">Récapitulatif du panier</h2>
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={`${item.product.id}-${item.size.label}`} className="flex gap-4">
                  <div className="relative">
                    <img src={getImageUrl(item.product.image)} alt={item.product.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0 shadow-sm" />
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">Dimensions: {item.size.label}</p>
                    <p className="text-sm font-black text-primary">{formatPrice(item.size.price * item.quantity)}</p>
                    
                    {/* Free gifts section - Automatic display, no checkboxes */}
                    {(item.product as any).freeGifts && (item.product as any).freeGifts.length > 0 && (
                      <div className="mt-4 space-y-2 border-l-2 border-primary/20 pl-3">
                        <p className="text-[10px] font-black text-primary uppercase flex items-center gap-1 tracking-tighter">
                          <Gift className="w-3 h-3" /> Cadeau inclus
                        </p>
                        {(item.product as any).freeGifts.map((gift: any) => (
                          <div key={gift.id} className="bg-emerald-50/50 rounded-xl p-2 border border-emerald-100 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                            {gift.image && <img src={getImageUrl(gift.image)} alt={gift.titre} className="w-10 h-10 object-cover rounded-lg flex-shrink-0 shadow-xs" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[11px] text-emerald-800 truncate">{gift.titre}</p>
                              <p className="text-[9px] text-emerald-600 font-medium">Offert avec cet article</p>
                            </div>
                            <div className="bg-emerald-100 p-1 rounded-full">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison standard</span>
                <span className="text-emerald-600 font-bold">Gratuite</span>
              </div>
              <div className="flex justify-between text-xl font-black border-t border-dashed border-border pt-3">
                <span>Total TTC</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-dashed border-border">
              <Package className="w-4 h-4 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                En confirmant votre commande, vous acceptez nos conditions générales de vente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
