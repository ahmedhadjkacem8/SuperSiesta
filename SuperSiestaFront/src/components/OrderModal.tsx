import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";

export type OrderSizeGroup = "1 Place" | "1 Place et Demi" | "2 Places";

const normalizeDimensionLabel = (label: string | undefined | null) => {
  if (!label) return "";
  return label.toString().replace(/\s*[x×]\s*/gi, "×").trim();
};

const normalizeBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "off", "null", "undefined", ""].includes(normalized)) return false;
  }
  return Boolean(value);
};

const normalizeNbPlacesValue = (value: any): string | null => {
  if (!value) return null;
  const cleaned = String(value).trim().toLowerCase();
  if (cleaned === "1" || cleaned === "1.0" || cleaned === "1 place") return "1";
  if (cleaned === "1.5" || cleaned === "1,5" || cleaned === "1 place et demi") return "1.5";
  if (cleaned === "2" || cleaned === "2.0" || cleaned === "2 places") return "2";
  return cleaned;
};

const mapGroupToNbPlacesValue = (group: OrderSizeGroup): string => {
  if (group === "1 Place") return "1";
  if (group === "1 Place et Demi") return "1.5";
  return "2";
};

const REGIONS = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

interface OrderModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeGroup: OrderSizeGroup;
}

export default function OrderModal({ product, open, onOpenChange, sizeGroup }: OrderModalProps) {
  const navigate = useNavigate();
  const [dimensions, setDimensions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const res = await api.get('/dimensions');
        if (res) {
          setDimensions(Array.isArray(res) ? res : (res as any).data || []);
        }
      } catch {
        setDimensions([]);
      }
    };

    fetchDimensions();
  }, []);

  const dimensionByLabel = useMemo(() => {
    const m = new Map();
    dimensions.forEach((d) => {
      if (d && d.label) {
        m.set(normalizeDimensionLabel(d.label), d);
      }
    });
    return m;
  }, [dimensions]);

  const availableSizes = useMemo(() => {
    const targetPlaces = mapGroupToNbPlacesValue(sizeGroup);
    const filtered = product.sizes.filter((size) => {
      const normLabel = normalizeDimensionLabel(size.label);
      const dimMeta = dimensionByLabel.get(normLabel);
      if (dimMeta && dimMeta.nb_places !== null && dimMeta.nb_places !== undefined) {
        return normalizeNbPlacesValue(dimMeta.nb_places) === targetPlaces;
      }
      // Fallback
      if (sizeGroup === "1 Place") return ["90×190", "100×190"].includes(normLabel);
      if (sizeGroup === "1 Place et Demi") return ["120×190"].includes(normLabel);
      if (sizeGroup === "2 Places") return ["140×190", "160×190", "160×200", "180×200"].includes(normLabel);
      return false;
    });
    return filtered.length > 0 ? filtered : product.sizes;
  }, [product.sizes, sizeGroup, dimensionByLabel]);

  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const selectedSize = availableSizes.find((size) => size.id === selectedSizeId) || availableSizes[0];
  const [step, setStep] = useState(1);
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    telephone: "",
    ville: "",
    adresse: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setStep(1);
      setQty(1);
      setForm({ full_name: "", telephone: "", ville: "", adresse: "", notes: "" });
      setErrors({});
      if (availableSizes.length > 0) {
        setSelectedSizeId(availableSizes[0].id);
      }
    }
  }, [open]);

  useEffect(() => {
    if (availableSizes.length > 0) {
      if (!selectedSizeId || !availableSizes.some((s) => s.id === selectedSizeId)) {
        setSelectedSizeId(availableSizes[0].id);
      }
    }
  }, [availableSizes, selectedSizeId]);

  const validateStep2 = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.full_name.trim()) nextErrors.full_name = "Nom complet requis";
    if (!form.telephone.trim() || !/^\+?[\d\s]{8,}$/.test(form.telephone)) nextErrors.telephone = "Téléphone invalide";
    if (!form.ville.trim()) nextErrors.ville = "Ville requise";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedSize) return;
    setSubmitting(true);

    try {
      await api.createOrder({
        full_name: form.full_name,
        phone: form.telephone,
        address: form.adresse || "",
        city: form.ville,
        notes: form.notes || "",
        items: [
          {
            product_id: product.id,
            product_name: product.name,
            size_label: selectedSize.label,
            unit_price: selectedSize.price,
            quantity: qty,
          },
        ],
      });
      setSuccess(true);
    } catch (error: any) {
      toast.error(`Erreur lors de l'envoi de la commande : ${error?.message || "Veuillez réessayer"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isSurCommande = selectedSize ? selectedSize.price <= 0 : false;
  const totalPrice = selectedSize && !isSurCommande ? selectedSize.price * qty : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Commande rapide — {product.name}</DialogTitle>
        <div className="relative bg-background rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-primary font-bold">Commande rapide</p>
              <h2 className="mt-2 text-2xl font-black">{product.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">{sizeGroup}</p>
            </div>
          </div>

          {/* Stepper — style barres segmentées */}
          <div className="px-6 pt-5 pb-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {success ? (
            <div className="px-6 pb-8 pt-4 text-center">
              <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-3">Commande confirmée !</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Merci <strong>{form.full_name}</strong> pour votre commande !
              </p>
              <p className="text-sm text-muted-foreground mb-5">
                Notre équipe vous contactera au <strong>{form.telephone}</strong> pour confirmer la livraison.
              </p>
              <div className="bg-accent rounded-2xl p-3 mb-6 text-sm text-accent-foreground font-medium">
                ✅ Paiement à la livraison — Livraison gratuite
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { onOpenChange(false); navigate("/boutique"); }}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Continuer mes achats
                </button>
                <button
                  onClick={() => { onOpenChange(false); navigate("/"); }}
                  className="w-full border border-border py-3 rounded-2xl font-bold text-sm hover:bg-muted transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 pb-6 space-y-5">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold">Choisissez la dimension</p>
                    <p className="text-xs text-muted-foreground">Sélectionnez la dimension correspondant à votre catégorie de places.</p>
                  </div>
                  {availableSizes.length === 0 ? (
                    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                      Aucune dimension disponible pour cette catégorie de places.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => {
                        const selected = selectedSize?.id === size.id;
                        const normalizedSizeLabel = normalizeDimensionLabel(size.label);
                        const dimensionMeta = dimensionByLabel.get(normalizedSizeLabel) || dimensions.find((dimension: any) => normalizeDimensionLabel(dimension?.label) === normalizedSizeLabel);
                        const isStandard = dimensionMeta ? normalizeBooleanValue(dimensionMeta.is_standard) : false;
                        const isSurCommande = size.price <= 0;
                        const priceText = size.price > 0 ? formatPrice(size.price) : "Sur commande";
                        const baseClass = "relative min-w-[120px] px-3 py-3 rounded-xl text-left border-2 transition-all";
                        const selectedClass = "border-primary bg-primary text-primary-foreground";
                        const normalClass = "border-border hover:border-primary bg-card";
                        const surCommandeClass = "border-amber-200 bg-amber-50/30 hover:bg-amber-100 hover:border-amber-400";
                        const selectedSurCommandeClass = "border-amber-400 bg-amber-100 text-amber-900";

                        let sizeClass = normalClass;
                        if (selected) {
                          sizeClass = selectedClass;
                        } else if (isSurCommande) {
                          sizeClass = surCommandeClass;
                        } else if (isStandard) {
                          sizeClass = "border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary";
                        } else {
                          sizeClass = "border-amber-200 bg-amber-50/30 hover:bg-amber-100 hover:border-amber-400";
                        }
                        if (selected && isSurCommande) {
                          sizeClass = selectedSurCommandeClass;
                        } else if (selected && isStandard) {
                          sizeClass = "border-primary bg-primary text-primary-foreground";
                        } else if (selected && !isStandard) {
                          sizeClass = "border-amber-400 bg-amber-100 text-amber-900";
                        }

                        return (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => setSelectedSizeId(size.id)}
                            className={`${baseClass} ${sizeClass}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-black text-sm">{size.label}</p>
                                <p className={`mt-1 text-xs font-bold ${
                                  selected
                                    ? (isStandard ? "text-primary-foreground/90" : "text-amber-950/80")
                                    : (isStandard ? "text-primary/80" : "text-amber-700/80")
                                }`}>
                                  {priceText}
                                </p>
                              </div>
                              {dimensionMeta && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isSurCommande ? "bg-amber-500 text-white" : isStandard ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
                                  {isSurCommande ? "Sur commande" : isStandard ? "Standard" : "Spéciale"}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div className="mb-1">
                    <p className="text-sm font-bold">Étape 2 — Vos coordonnées</p>
                    <p className="text-xs text-muted-foreground mt-1">Nous vous contacterons pour confirmer</p>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Nom complet *"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-background focus:outline-none focus:border-primary transition-colors ${errors.full_name ? "border-destructive" : "border-border"}`}
                    />
                    {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
                  </div>

                  <div>
                    <input
                      type="tel"
                      placeholder="Téléphone *"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-background focus:outline-none focus:border-primary transition-colors ${errors.telephone ? "border-destructive" : "border-border"}`}
                    />
                    {errors.telephone && <p className="text-xs text-destructive mt-1">{errors.telephone}</p>}
                  </div>

                  <div>
                    <select
                      value={form.ville}
                      onChange={(e) => setForm({ ...form, ville: e.target.value })}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-background focus:outline-none focus:border-primary transition-colors ${errors.ville ? "border-destructive" : "border-border"} ${!form.ville ? "text-muted-foreground" : ""}`}
                    >
                      <option value="">Ville *</option>
                      {REGIONS.map((r) => (
                        <option key={r} value={r} className="text-foreground">{r}</option>
                      ))}
                    </select>
                    {errors.ville && <p className="text-xs text-destructive mt-1">{errors.ville}</p>}
                  </div>

                  <input
                    placeholder="Adresse (optionnel)"
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background focus:outline-none focus:border-primary transition-colors"
                  />

                  <textarea
                    placeholder="Notes (optionnel)"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              )}

              {step === 3 && selectedSize && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold">Résumé de commande</p>
                    <p className="text-xs text-muted-foreground">Vérifiez avant d’envoyer.</p>
                  </div>
                  <div className="rounded-[2rem] border border-border bg-muted p-5 space-y-4">
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Produit</span><span>{product.name}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Catégorie</span><span>{sizeGroup}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Dimension</span><span>{selectedSize.label}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground items-center"><span>Quantité</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-sm">-</button>
                        <span className="w-8 text-center font-bold">{qty}</span>
                        <button type="button" onClick={() => setQty(qty + 1)} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-sm">+</button>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-center text-base font-black">
                      <span>Total</span>
                      {isSurCommande ? (
                        <span className="flex items-center gap-2">
                          <span className="text-amber-600 font-black">Sur commande</span>
                          <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            × {qty}
                          </span>
                        </span>
                      ) : (
                        <span className="text-primary">{totalPrice.toLocaleString()} DT</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Paiement à la livraison • Livraison gratuite</p>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-border">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 rounded-2xl border border-border px-4 py-3 font-bold text-sm hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 inline-block mr-2" /> Retour
                  </button>
                )}
                {step < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 2 && !validateStep2()) return;
                      setStep(step + 1);
                    }}
                    disabled={step === 1 && !selectedSize}
                    className="flex-1 rounded-2xl bg-primary text-primary-foreground font-bold px-4 py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Continuer <ArrowRight className="w-4 h-4 inline-block ml-2" />
                  </button>
                )}
                {step === 3 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-2xl bg-primary text-primary-foreground font-black px-4 py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</span> : "Passer la commande"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
