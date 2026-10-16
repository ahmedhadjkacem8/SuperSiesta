import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { useFreegiftsByProduct } from "@/hooks/useFreegifts";
import { Check, ChevronLeft, Package, Phone, MapPin, User, Loader2, Navigation, Gift, Mail, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatPrice } from "@/lib/utils";
import { getImageUrl } from "@/utils/imageUtils";
import { generateEventId, trackInitiateCheckout, trackPurchase, getFbpCookie, getFbcCookie } from "@/services/metaPixel";
import { trackGABeginCheckout, trackGAPurchase, trackGAContactClick } from "@/services/analytics";
import { getAdsClickIds, syncMetaAttribution } from "@/services/adsAttribution";
import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/hooks/useSettings";

const villes = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

const FORM_STORAGE_KEY = "supersiesta_commander_form";
const FORM_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

const normalizeDimensionLabel = (label: string | undefined | null) =>
  label?.replace(/\s*[x×]\s*/gi, "×").trim() || "";

const isTruthy = (value: unknown) =>
  value === true || value === 1 || ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());

function appendFormDataValue(formData: FormData, key: string, value: unknown) {
  if (value === null || value === undefined) {
    formData.append(key, "");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormDataValue(formData, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) =>
      appendFormDataValue(formData, `${key}[${childKey}]`, childValue)
    );
    return;
  }
  if (typeof value === "boolean") {
    formData.append(key, value ? "1" : "0");
    return;
  }
  formData.append(key, String(value));
}

function loadFormFromStorage() {
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.expiry || Date.now() > parsed.expiry) {
      localStorage.removeItem(FORM_STORAGE_KEY);
      return null;
    }
    return parsed.data || null;
  } catch {
    return null;
  }
}

function saveFormToStorage(data: Record<string, any>) {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
      data,
      expiry: Date.now() + FORM_TTL_MS,
    }));
  } catch {}
}

function clearFormStorage() {
  try { localStorage.removeItem(FORM_STORAGE_KEY); } catch {}
}

function generateOrderNumber() {
  const d = new Date();
  return `CMD-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

export default function Commander() {
  const navigate = useNavigate();
  const { t, isRTL, lang } = useLanguage();
  const { settings } = useSettings();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();

  const surCommandeCount = items
    .filter((item) => item.size.price <= 0)
    .reduce((sum, item) => sum + item.quantity, 0);

  const savedForm = loadFormFromStorage();

  const [form, setForm] = useState({ 
    full_name: savedForm?.full_name || "", 
    email: savedForm?.email || "", 
    telephone: savedForm?.telephone || "", 
    telephone2: savedForm?.telephone2 || "", 
    adresse: savedForm?.adresse || "", 
    ville: savedForm?.ville || "", 
    notes: savedForm?.notes || "", 
    createAccount: false, 
    password: "", 
    latitude: null as number | null, 
    longitude: null as number | null 
  });
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | number | null>(null);
  const [metaPurchaseOrderId, setMetaPurchaseOrderId] = useState<string | number | null>(null);
  const [blContact, setBlContact] = useState("");
  const [blSent, setBlSent] = useState(false);
  const [blSending, setBlSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [dimensionsLoaded, setDimensionsLoaded] = useState(false);
  const [dimensionsLoadError, setDimensionsLoadError] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState<string | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  const prospectIdRef = useRef<string | null>(sessionStorage.getItem("current_prospect_id"));
  const isSavingProspect = useRef(false);
  const [isProspectSaved, setIsProspectSaved] = useState(false);
  const purchaseEventIdRef = useRef<string>(generateEventId());
  const metaPurchaseTrackedRef = useRef(false);
  const hasSpecialDimensions = items.some((item) => {
    const dimension = dimensions.find(
      (candidate) => normalizeDimensionLabel(candidate.label) === normalizeDimensionLabel(item.size.label)
    );
    return dimension ? !isTruthy(dimension.is_standard) : false;
  });

  useEffect(() => {
    if (!paymentProof) {
      setPaymentProofPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(paymentProof);
    setPaymentProofPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [paymentProof]);

  // Track Meta Pixel InitiateCheckout & GA4 begin_checkout on mount
  useEffect(() => {
    if (items.length > 0) {
      const checkoutItems = items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        price: i.size.price,
        quantity: i.quantity,
        category: (i.product as any).categorie || i.product.category,
      }));
      trackInitiateCheckout(
        checkoutItems,
        total,
        undefined,
        user ? { email: user.email, full_name: user.name } : undefined
      );
      trackGABeginCheckout(checkoutItems, total);
    }
  }, []);

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

  // Save form to localStorage whenever it changes (fields only, not password)
  useEffect(() => {
    saveFormToStorage({
      full_name: form.full_name,
      email: form.email,
      telephone: form.telephone,
      telephone2: form.telephone2,
      adresse: form.adresse,
      ville: form.ville,
      notes: form.notes,
    });
  }, [form.full_name, form.email, form.telephone, form.telephone2, form.adresse, form.ville, form.notes]);

  // Fetch dimensions for gifts
  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const res = await api.get('/dimensions')
        if (res) setDimensions(Array.isArray(res) ? res : (res as any).data || [])
      } catch (err) {
        setDimensionsLoadError(true);
        console.error('Error fetching dimensions', err)
      } finally {
        setDimensionsLoaded(true);
      }
    }
    fetchDimensions()
  }, [])

  // Prospect logic: debounced upsert — only one prospect per session
  useEffect(() => {
    // Only save if we have at least a name or a phone number
    if ((!form.full_name.trim() && !form.telephone.trim()) || submitted || submitting) return;

    const timer = setTimeout(async () => {
      // Prevent concurrent API calls (race condition guard)
      if (isSavingProspect.current) return;
      isSavingProspect.current = true;

      try {
        const currentId = prospectIdRef.current;
        const payload = {
          id: currentId,
          full_name: form.full_name,
          email: form.email,
          phone: form.telephone,
          phone2: form.telephone2,
          address: form.adresse,
          city: form.ville,
          notes: form.notes,
          cart_items: items.map(item => ({
            id: item.product.id,
            name: item.product.name,
            size: item.size.label,
            price: item.size.price,
            quantity: item.quantity
          })),
          total: total,
          status: 'nouveau'
        };

        // Always use POST — the store endpoint handles upsert via the `id` field
        const res = await api.post<any>("/prospects", payload);
        if (res && res.id && !currentId) {
          // Update ref synchronously to block any concurrent POST
          prospectIdRef.current = res.id;
          sessionStorage.setItem("current_prospect_id", res.id);
        }
        setIsProspectSaved(true);
      } catch (err) {
        console.error("Failed to save prospect", err);
      } finally {
        isSavingProspect.current = false;
      }
    }, 2000); // Wait 2 seconds of inactivity before saving

    return () => clearTimeout(timer);
  }, [form, items, total, submitted, submitting]);


  useEffect(() => {
    if (!submitted || !metaPurchaseOrderId || metaPurchaseTrackedRef.current) return;

    let cancelled = false;
    let attempts = 0;
    let timeout: number | undefined;

    const checkPurchaseStatus = async () => {
      try {
        const purchase = await api.get<{
          ready: boolean;
          event_id: string;
          order_id: string;
          value: number;
          items: Array<{ id: string; name: string; price: number; quantity: number }>;
        }>(`/orders/${metaPurchaseOrderId}/meta-purchase-status?check=${Date.now()}`);

        if (cancelled) return;
        if (purchase.ready) {
          trackPurchase({
            orderId: purchase.order_id,
            value: purchase.value,
            items: purchase.items,
          }, purchase.event_id);
          metaPurchaseTrackedRef.current = true;
          return;
        }
      } catch (error) {
        if (!cancelled && attempts === 0) {
          console.warn("Meta Purchase status could not be checked from the checkout page.", error);
        }
      }

      attempts += 1;
      if (!cancelled && attempts < 60) {
        timeout = window.setTimeout(checkPurchaseStatus, 30_000);
      }
    };

    timeout = window.setTimeout(checkPurchaseStatus, 15_000);
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [metaPurchaseOrderId, submitted]);

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg font-medium mb-4">{t.checkout.emptyCart}</p>
          <button onClick={() => navigate("/boutique")} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors">{t.checkout.viewProducts}</button>
        </div>
      </div>
    );
  }

  const handleSendBlContact = async () => {
    if (!blContact.trim() || !lastOrderId) return;
    setBlSending(true);
    try {
      await api.put(`/orders/${lastOrderId}/bl-contact`, { bl_contact: blContact.trim() });
      trackGAContactClick("whatsapp", blContact.trim());
      setBlSent(true);
    } catch {
      // silent — non-blocking
      setBlSent(true);
    } finally {
      setBlSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          {/* Success card */}
          <div className="text-center bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black mb-3">{t.checkout.orderConfirmed}</h1>
            <p className="text-muted-foreground mb-2">
              {t.checkout.thankYou} <strong>{form.full_name}</strong> {t.checkout.forOrder}
            </p>
            <p className="text-muted-foreground mb-6">
              {t.checkout.teamContact} <strong>{form.telephone}</strong>{form.telephone2 ? ` / ${form.telephone2}` : ""} {t.checkout.toConfirm}
            </p>
            <div className="bg-accent rounded-2xl p-4 mb-6 text-sm text-accent-foreground">{t.checkout.codBanner}</div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user && (
                <button onClick={() => navigate("/mon-compte")} className="bg-secondary text-secondary-foreground font-bold px-6 py-3 rounded-2xl hover:bg-secondary/80 transition-colors">
                  {t.checkout.viewOrders}
                </button>
              )}
              <button onClick={() => navigate("/")} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors">
                {t.checkout.backHome}
              </button>
            </div>
          </div>

          {/* BL provisoire card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📄</span>
              </div>
              <div>
                <p className="font-bold text-sm">Recevoir votre BL provisoire</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Entrez votre numéro WhatsApp ou email pour recevoir un bon de livraison provisoire.
                </p>
              </div>
            </div>
            {blSent ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl px-4 py-3">
                <Check className="w-4 h-4 flex-shrink-0" />
                Enregistré ! Vous recevrez votre BL prochainement.
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="WhatsApp ou Email"
                  value={blContact}
                  onChange={(e) => setBlContact(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendBlContact()}
                  className="flex-1 px-4 py-2.5 border-2 border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleSendBlContact}
                  disabled={!blContact.trim() || blSending}
                  className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {blSending ? "..." : "Envoyer"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = t.checkout.nameRequired;
    
    if (form.createAccount && (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))) {
      e.email = "Email requis pour créer un compte";
    } else if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = t.checkout.invalidPhone ? "Email invalide" : "Invalid email";
    }
    
    if (!form.telephone.trim() || !/^\+?[\d\s]{8,}$/.test(form.telephone)) e.telephone = t.checkout.invalidPhone;
    if (!form.ville) e.ville = t.checkout.cityRequired;
    
    if (form.createAccount && (!form.password || form.password.length < 8)) e.password = "Le mot de passe doit faire au moins 8 caractères";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dimensionsLoaded || dimensionsLoadError) {
      toast.error(t.checkout.dimensionLoadError);
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      
      // Automatically include all free gifts from items
      const allGifts: any[] = [];
      const giftIds = new Set<string | number>();

      items.forEach(item => {
        const currentDim = dimensions.find(d => d.label === item.size.label);
        const sizeGifts = currentDim?.free_gifts || [];
        
        sizeGifts.forEach((gift: any) => {
          if (!giftIds.has(gift.id)) {
            allGifts.push({
              free_gift_id: gift.id,
              quantity: 1 
            });
            giftIds.add(gift.id);
          }
        });
      });

      const metaClickCaptured = await syncMetaAttribution();
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
        free_gifts: allGifts.length > 0 ? allGifts : undefined,
        meta_event_id: metaClickCaptured ? purchaseEventIdRef.current : undefined,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        fbp: getFbpCookie(),
        fbc: getFbcCookie(),
        ...getAdsClickIds(),
      };

      let orderPayload: FormData | typeof payload = payload;
      if (paymentProof) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => appendFormDataValue(formData, key, value));
        formData.append("payment_proof", paymentProof);
        orderPayload = formData;
      }
      const response = await api.post<any>("/orders", orderPayload);
      
      const orderId = response?.order?.id || response?.id || orderNumber;

      if (response?.meta_attributed && orderId) {
        setMetaPurchaseOrderId(orderId);
      }

      // Track Google Ads / GA4 Purchase with anti-duplicate guard
      try {
        const storageKey = "ga_purchased_orders";
        const raw = sessionStorage.getItem(storageKey);
        const purchasedOrders: string[] = raw ? JSON.parse(raw) : [];
        if (!purchasedOrders.includes(String(orderId))) {
          trackGAPurchase(
            String(orderId),
            total,
            items.map((i) => ({
              id: i.product.id,
              name: i.product.name,
              price: i.size.price,
              quantity: i.quantity,
              category: (i.product as any).categorie || i.product.category,
            })),
            {
              email: form.email,
              phone: form.telephone,
              first_name: form.full_name,
              city: form.ville,
            }
          );
          purchasedOrders.push(String(orderId));
          sessionStorage.setItem(storageKey, JSON.stringify(purchasedOrders));
        }
      } catch {
        trackGAPurchase(
          String(orderId),
          total,
          items.map((i) => ({
            id: i.product.id,
            name: i.product.name,
            price: i.size.price,
            quantity: i.quantity,
            category: (i.product as any).categorie || i.product.category,
          })),
          {
            email: form.email,
            phone: form.telephone,
            first_name: form.full_name,
            city: form.ville,
          }
        );
      }

      if (response.token) {
        localStorage.setItem("auth_token", response.token);
      }
      if (orderId) setLastOrderId(orderId);
      setSubmitted(true);
      clearCart();
      clearFormStorage();
      sessionStorage.removeItem("current_prospect_id");
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
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Requis</span>
          </div>
        )}
      </div>
      {errors[name] && <p className="text-[11px] font-bold text-destructive mt-1.5 animate-in slide-in-from-top-1">{errors[name]}</p>}
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        {t.checkout.back}
      </button>
      <h1 className="text-3xl font-black mb-8">{t.checkout.title}</h1>

      {/* Saved info banner */}
      {user && useSaved && profileLoaded && (
        <div className="bg-accent border border-primary/20 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-accent-foreground">{t.checkout.prefilled}</p>
            <p className="text-xs text-muted-foreground">{t.checkout.prefilledSub}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-primary"><User className="w-5 h-5" />{t.checkout.yourInfo}</h2>
            <div className="space-y-4">
              {field("full_name", t.checkout.fullName, <User className="w-4 h-4" />, { placeholder: t.auth.namePlaceholder }, true)}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field("telephone", t.checkout.phone, <Phone className="w-4 h-4" />, { placeholder: "XX XXX XXX", type: "tel" }, true)}
                {field("telephone2", `${t.checkout.phone} 2 (Optionnel)`, <Phone className="w-4 h-4" />, { placeholder: "XX XXX XXX", type: "tel" }, false)}
              </div>
              <div>{field("email", "Email", <Mail className="w-4 h-4" />, { placeholder: t.auth.emailPlaceholder, type: "email" }, false)}</div>
            </div>
            
            {!user && (
              <div className="mt-6 pt-6 border-t border-border">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${form.createAccount ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}>
                    {form.createAccount && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
                  <div>
                    <p className="text-sm font-bold">{t.auth.createAccount} ?</p>
                    <p className="text-xs text-muted-foreground">{t.auth.accessAccount}</p>
                  </div>
                </label>
                
                {form.createAccount && (
                  <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                    {field("password", t.auth.password, <Check className="w-4 h-4" />, { placeholder: t.auth.passwordPlaceholder, type: "password" }, true)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg flex items-center gap-2 text-primary"><MapPin className="w-5 h-5" />{t.checkout.deliveryAddress}</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  {t.checkout.city} 
                  <span className="text-destructive font-black text-lg leading-none">*</span>
                </label>
                <div className="relative group">
                  <div className={`absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 transition-colors ${errors.ville ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"}`}><MapPin className="w-4 h-4" /></div>
                  <select 
                    value={form.ville} 
                    onChange={(e) => { setForm({ ...form, ville: e.target.value }); if (errors.ville) setErrors({ ...errors, ville: "" }); }} 
                    className={`w-full pl-9 pr-10 rtl:pr-9 rtl:pl-10 py-3 border-2 rounded-xl text-sm focus:outline-none transition-all duration-200 bg-background appearance-none ${
                      errors.ville 
                        ? "border-destructive/50 bg-destructive/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]" 
                        : "border-border hover:border-primary/30 focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary-rgb),0.1)] shadow-sm"
                    } ${!form.ville ? "border-l-4 rtl:border-l-0 rtl:border-r-4 border-l-primary/40 rtl:border-r-primary/40" : ""}`}
                  >
                    <option value="">{t.checkout.selectCity}</option>
                    {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  {!form.ville && !errors.ville && (
                    <div className="absolute right-10 rtl:right-auto rtl:left-10 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Requis</span>
                    </div>
                  )}
                  <div className="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none border-l rtl:border-l-0 rtl:border-r pl-2 rtl:pl-0 rtl:pr-2 border-border">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {errors.ville && <p className="text-[11px] font-bold text-destructive mt-1.5 animate-in slide-in-from-top-1">{errors.ville}</p>}
              </div>

              {field("adresse", t.checkout.address, <MapPin className="w-4 h-4" />, { placeholder: "Rue, immeuble, appartement... (Optionnel)" }, false)}

              <div>
                <label className="text-sm font-medium block mb-1.5">{t.checkout.notes}</label>
                <textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  placeholder={t.checkout.notesPlaceholder} 
                  rows={3} 
                  className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm focus:outline-none focus:border-primary hover:border-primary/30 transition-all bg-background resize-none shadow-sm" 
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-primary">{t.checkout.paymentMode}</h2>
            <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-4 border-2 border-primary/20">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm"><Check className="w-4 h-4 text-primary-foreground" /></div>
              <div>
                <p className="font-bold text-sm">{t.checkout.cod}</p>
                <p className="text-xs text-muted-foreground">{t.checkout.codDesc}</p>
              </div>
            </div>
          </div>

          {hasSpecialDimensions && (
            <>
              {settings[`checkout_special_dimension_notice_${lang}`]?.trim() && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
                  {settings[`checkout_special_dimension_notice_${lang}`]}
                </div>
              )}
              <div className="rounded-xl border border-border bg-card p-4">
                <label htmlFor="payment-proof" className="mb-1 block text-sm font-bold">
                  {t.checkout.paymentProof} <span className="font-normal text-muted-foreground">({t.checkout.optional})</span>
                </label>
                <input
                  id="payment-proof"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => setPaymentProof(event.target.files?.[0] || null)}
                  className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary"
                />
                {paymentProof && paymentProofPreviewUrl && (
                  <div className="mt-4 space-y-3">
                    {paymentProof.type === "application/pdf" ? (
                      <iframe
                        src={paymentProofPreviewUrl}
                        title={t.checkout.paymentProof}
                        className="h-64 w-full rounded-lg border border-border"
                      />
                    ) : (
                      <img
                        src={paymentProofPreviewUrl}
                        alt={t.checkout.paymentProof}
                        className="max-h-64 max-w-full rounded-lg border border-border object-contain"
                      />
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs text-muted-foreground">{paymentProof.name}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentProof(null);
                          const input = document.getElementById("payment-proof") as HTMLInputElement | null;
                          if (input) input.value = "";
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t.checkout.removePaymentProof}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {dimensionsLoadError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {t.checkout.dimensionLoadError}
            </p>
          )}
          <button type="submit" disabled={submitting || !dimensionsLoaded || dimensionsLoadError} className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-primary/90 transition-all text-lg shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-[0.98]">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {t.checkout.sending}</> : t.checkout.confirmOrder}
          </button>
        </form>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
            <h2 className="font-bold text-lg mb-5">{t.checkout.summary}</h2>
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
                    <p className="text-sm font-black text-primary">
                      {item.size.price > 0 ? formatPrice(item.size.price * item.quantity) : "Sur commande"}
                    </p>
                    
                    {(() => {
                      const currentDim = dimensions.find(d => d.label === item.size.label);
                      const sizeGifts = currentDim?.free_gifts || [];
                      
                      if (sizeGifts.length === 0) return null;

                      return (
                        <div className="mt-4 space-y-2 border-l-2 border-primary/20 pl-3">
                          <p className="text-[10px] font-black text-primary uppercase flex items-center gap-1 tracking-tighter">
                            <Gift className="w-3 h-3" /> Cadeau inclus
                          </p>
                          {sizeGifts.map((gift: any) => (
                            <div key={gift.id} className="bg-emerald-50/50 rounded-xl p-2 border border-emerald-100 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                              {gift.image && <img src={getImageUrl(gift.image)} alt={gift.titre} className="w-10 h-10 object-cover rounded-lg flex-shrink-0 shadow-xs" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[11px] text-emerald-800 truncate">{gift.titre}</p>
                                <p className="text-[9px] text-emerald-600 font-medium">Offert avec cette dimension</p>
                              </div>
                              <div className="bg-emerald-100 p-1 rounded-full">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.checkout.delivery}</span>
                <span className="text-emerald-600 font-bold">{t.checkout.free}</span>
              </div>
              <div className="flex justify-between items-start text-xl font-black border-t border-dashed border-border pt-3">
                <span>{t.cart.total}</span>
                {surCommandeCount > 0 ? (
                  <div className="flex flex-col items-end gap-1">
                    {total > 0 ? (
                      <>
                        <span className="text-primary">{formatPrice(total)}</span>
                        <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm mt-0.5">
                          + {surCommandeCount} sur commande
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-600">Sur commande</span>
                        <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm mt-0.5">
                          × {surCommandeCount}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-primary">{formatPrice(total)}</span>
                )}
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
