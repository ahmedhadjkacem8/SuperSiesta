import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { useFreegiftsByProduct } from "@/hooks/useFreegifts";
import { Check, ChevronLeft, Package, Phone, MapPin, User, Loader2, Navigation, Gift } from "lucide-react";
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
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", adresse: "", ville: "", notes: "", createAccount: false, password: "", latitude: null as number | null, longitude: null as number | null });
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [useSaved, setUseSaved] = useState(false);


  const [selectedGifts, setSelectedGifts] = useState<Record<string | number, number>>({}); // gift_id => quantity

  // Auto-fill from profile when logged in
  useEffect(() => {
    if (!user) return;
    api.get<any>("/user/profile").then((profile) => {
      if (!profile) return;
      const nameParts = (profile.full_name || "").trim().split(/\s+/);
      const prenom = nameParts[0] || "";
      const nom = nameParts.slice(1).join(" ") || "";
      
      setForm((prev) => ({
        ...prev,
        prenom: prenom || prev.prenom,
        nom: nom || prev.nom,
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
          <p className="text-muted-foreground mb-2">Merci <strong>{form.prenom} {form.nom}</strong> pour votre commande !</p>
          <p className="text-muted-foreground mb-6">Notre équipe vous contactera au <strong>{form.telephone}</strong> pour confirmer la livraison.</p>
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
    if (!form.nom.trim()) e.nom = "Nom requis";
    if (!form.prenom.trim()) e.prenom = "Prénom requis";
    if (form.createAccount && (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))) {
      e.email = "Email requis pour créer un compte";
    } else if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Email invalide";
    }
    if (!form.telephone.trim() || !/^\+?[\d\s]{8,}$/.test(form.telephone)) e.telephone = "Numéro invalide";
    if (!form.adresse.trim()) e.adresse = "Adresse requise";
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
      const payload: any = {
        order_number: orderNumber,
        full_name: `${form.prenom} ${form.nom}`,
        email: form.email || null,
        phone: form.telephone,
        address: form.adresse,
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
      };

      // Add selected free gifts
      const gifts = Object.entries(selectedGifts)
        .filter(([_, qty]) => qty > 0)
        .map(([giftId, qty]) => ({
          free_gift_id: giftId,
          quantity: qty,
        }));
      
      if (gifts.length > 0) {
        payload.free_gifts = gifts;
      }

      const response = await api.post<any>("/orders", payload);
      
      // If a token is returned, log the user in automatically
      if (response.token) {
        localStorage.setItem("auth_token", response.token);
        // Refresh page or trigger auth state update if needed
        // For now we just show success. 
        // The useAuth hook might need a reload signal.
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

  const field = (name: keyof typeof form, label: string, icon: React.ReactNode, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input {...props} value={form[name] as string} onChange={(e) => { setForm({ ...form, [name]: e.target.value }); if (errors[name]) setErrors({ ...errors, [name]: "" }); }} className={`w-full pl-9 pr-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors bg-background ${errors[name] ? "border-destructive" : "border-border"}`} />
      </div>
      {errors[name] && <p className="text-xs text-destructive mt-1">{errors[name]}</p>}
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
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2"><User className="w-5 h-5 text-primary" />Vos informations</h2>
            <div className="grid grid-cols-2 gap-4">
              {field("prenom", "Prénom", <User className="w-4 h-4" />, { placeholder: "Votre prénom" })}
              {field("nom", "Nom", <User className="w-4 h-4" />, { placeholder: "Votre nom" })}
            </div>
            <div className="mt-4">{field("email", "E-mail", <User className="w-4 h-4" />, { placeholder: "votre@email.com", type: "email" })}</div>
            <div className="mt-4">{field("telephone", "Téléphone", <Phone className="w-4 h-4" />, { placeholder: "+216 XX XXX XXX", type: "tel" })}</div>
            
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
                    {field("password", "Choisissez un mot de passe", <Check className="w-4 h-4" />, { placeholder: "Min. 8 caractères", type: "password" })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Adresse de livraison</h2>
              <button 
                type="button" 
                onClick={handleGetLocation} 
                disabled={locating}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${form.latitude ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"}`}
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                {form.latitude ? "Position enregistrée" : "Utiliser ma position actuelle"}
              </button>
            </div>
            {field("adresse", "Adresse", <MapPin className="w-4 h-4" />, { placeholder: "Rue, numéro, immeuble..." })}
            <div className="mt-4">
              <label className="text-sm font-medium block mb-1.5">Ville</label>
              <select value={form.ville} onChange={(e) => { setForm({ ...form, ville: e.target.value }); if (errors.ville) setErrors({ ...errors, ville: "" }); }} className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors bg-background ${errors.ville ? "border-destructive" : "border-border"}`}>
                <option value="">Sélectionner une ville...</option>
                {villes.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.ville && <p className="text-xs text-destructive mt-1">{errors.ville}</p>}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium block mb-1.5">Notes (optionnel)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Instructions spéciales pour la livraison..." rows={3} className="w-full px-4 py-2.5 border-2 border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors bg-background resize-none" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">Mode de paiement</h2>
            <div className="flex items-center gap-3 bg-accent rounded-xl p-4 border-2 border-primary">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-primary-foreground" /></div>
              <div><p className="font-bold text-sm">Paiement à la livraison</p><p className="text-xs text-muted-foreground">Vous payez en espèces lors de la réception</p></div>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-colors text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...</> : "Confirmer ma commande →"}
          </button>
        </form>
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-lg mb-5">Récapitulatif</h2>
            <div className="space-y-3 mb-5">
              {items.map((item) => (
                <div key={`${item.product.id}-${item.size.label}`} className="flex gap-3">
                  <img src={getImageUrl(item.product.image)} alt={item.product.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">Taille {item.size.label} × {item.quantity}</p>
                    <p className="text-sm font-bold text-primary">{formatPrice(item.size.price * item.quantity)}</p>
                    
                    {/* Free gifts for this specific product */}
                    {(item.product as any).freeGifts && (item.product as any).freeGifts.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-primary/20 pl-3">
                        <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                          <Gift className="w-3 h-3" /> Cadeaux disponibles
                        </p>
                        {(item.product as any).freeGifts.map((gift: any) => (
                          <div key={gift.id} className="bg-accent/30 rounded-lg p-2 border border-primary/5">
                            <div className="flex items-center gap-2">
                              {gift.image && <img src={getImageUrl(gift.image)} alt={gift.titre} className="w-8 h-8 object-cover rounded-md flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[11px] truncate">{gift.titre}</p>
                              </div>
                              <label className="flex items-center cursor-pointer group">
                                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${selectedGifts[gift.id] ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}>
                                  {selectedGifts[gift.id] > 0 && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={selectedGifts[gift.id] > 0} 
                                  onChange={(e) => {
                                    setSelectedGifts(prev => ({
                                      ...prev,
                                      [gift.id]: e.target.checked ? 1 : 0
                                    }));
                                  }} 
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>



            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Livraison</span><span className="text-primary font-medium">Gratuite</span></div>
              <div className="flex justify-between text-lg font-black"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
