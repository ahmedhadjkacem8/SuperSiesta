import { ShoppingCart, X, Check, Search } from "lucide-react";
import { Product, ProductSize } from "@/hooks/useProducts";
import type { OrderSizeGroup } from "@/components/OrderModal";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/utils/imageUtils";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

interface ProductCardProps {
  product: Product;
  selectedDimension?: string;
  selectedCategorie?: string;
  selectedGamme?: string;
  selectedFermete?: string;
  onImageClick?: (product: Product) => void;
  onSelectGroup?: (group: OrderSizeGroup) => void;
  verticalPlaceButtons?: boolean;
}

// ─── Groupes de dimensions par nombre de places ──────────────────────────────
const normalizeDim = (label: string | undefined | null) => {
  if (!label) return "";
  return label.toString().replace(/\s*[x×]\s*/gi, "×").trim();
};

const normalizeNbPlacesValue = (value: any): string | null => {
  if (!value) return null;
  const cleaned = String(value).trim().toLowerCase();
  if (cleaned === "1" || cleaned === "1.0" || cleaned === "1 place") return "1";
  if (cleaned === "1.5" || cleaned === "1,5" || cleaned === "1 place et demi") return "1.5";
  if (cleaned === "2" || cleaned === "2.0" || cleaned === "2 places") return "2";
  return cleaned;
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

// ─── Modal de sélection en 2 étapes ─────────────────────────────────────────
function DimensionModal({
  product,
  onClose,
  onAdd,
  addedSize,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (size: ProductSize) => void;
  addedSize: string | null;
}) {
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const res = await api.get('/dimensions');
        if (res) {
          setDimensions(Array.isArray(res) ? res : (res as any).data || []);
        }
      } catch (err) {
        console.error("Erreur de récupération des dimensions dans ProductCard:", err);
        setDimensions([]);
      }
    };
    fetchDimensions();
  }, []);

  const dimensionByLabel = useMemo(() => {
    const m = new Map();
    dimensions.forEach((d) => {
      if (d && d.label) {
        m.set(normalizeDim(d.label), d);
      }
    });
    return m;
  }, [dimensions]);

  const getSizeNbPlaces = (size: ProductSize) => {
    const normLabel = normalizeDim(size.label);
    const dimMeta = dimensionByLabel.get(normLabel);
    if (dimMeta && dimMeta.nb_places !== null && dimMeta.nb_places !== undefined) {
      const val = normalizeNbPlacesValue(dimMeta.nb_places);
      if (val) return val;
    }
    // Fallback if not loaded/not matching
    if (["90×190", "100×190"].includes(normLabel)) return "1";
    if (["120×190"].includes(normLabel)) return "1.5";
    if (["140×190", "160×190", "160×200", "180×200"].includes(normLabel)) return "2";
    return "2";
  };

  const availableSizes = (product.sizes || []).filter((s) => s.price > 0);

  // Filtrer les tailles selon le groupe sélectionné
  const filteredSizes = selectedGroup
    ? availableSizes.filter((s) => getSizeNbPlaces(s) === selectedGroup)
    : [];

  // Si le groupe sélectionné n'a pas de tailles disponibles, montrer toutes
  const sizesToShow =
    filteredSizes.length > 0 ? filteredSizes : availableSizes;

  const handleGroupSelect = (groupValue: string) => {
    setSelectedGroup(groupValue);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedGroup(null);
  };

  const PLACE_OPTIONS = [
    { value: "1", label: t.home.onePlace },
    { value: "1.5", label: t.home.placeAndHalf },
    { value: "2", label: t.home.twoPlaces },
  ];

  const hasSizesForGroup = (groupValue: string) => {
    return availableSizes.some((s) => getSizeNbPlaces(s) === groupValue);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="dim-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          key="dim-modal-panel"
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Barre de drag mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  onClick={handleBack}
                  className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
                  {t.product.addToCart}
                </p>
                <h3 className="text-base font-black leading-snug line-clamp-1">
                  {product.name}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-3 flex-shrink-0 p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Corps */}
          <div className="px-5 pt-4 pb-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs text-muted-foreground mb-4 text-center font-medium">
                    {t.shop.step1Places}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {PLACE_OPTIONS.map((option) => {
                      const hasSizes = hasSizesForGroup(option.value);
                      return (
                        <motion.button
                          key={option.value}
                          whileHover={hasSizes ? { scale: 1.05, y: -2 } : {}}
                          whileTap={hasSizes ? { scale: 0.95 } : {}}
                          onClick={() => hasSizes && handleGroupSelect(option.value)}
                          disabled={!hasSizes}
                          className={`relative py-5 px-2 rounded-2xl border-2 text-center font-bold text-sm transition-all overflow-hidden ${
                            hasSizes
                              ? "border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg cursor-pointer"
                              : "border-border bg-muted/30 text-muted-foreground opacity-55 cursor-not-allowed"
                          }`}
                        >
                          <span className="relative z-10 block">{option.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs text-muted-foreground mb-4 text-center font-medium">
                    {t.shop.step2Dimensions}
                  </p>

                  {sizesToShow.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-6">
                      {t.shop.noDimensions}
                    </p>
                  ) : (
                    <div
                      className={`grid gap-3 ${
                        sizesToShow.length <= 3
                          ? "grid-cols-3"
                          : sizesToShow.length === 4
                          ? "grid-cols-2 sm:grid-cols-4"
                          : sizesToShow.length === 5
                          ? "grid-cols-3 sm:grid-cols-5"
                          : "grid-cols-3 sm:grid-cols-4"
                      }`}
                    >
                      {sizesToShow.map((size, index) => {
                        const isAdded = addedSize === size.label;
                        const normLabel = normalizeDim(size.label);
                        const dimMeta = dimensionByLabel.get(normLabel);
                        const isStandard = dimMeta ? normalizeBooleanValue(dimMeta.is_standard) : true;
                        const isSurCommande = size.price <= 0;

                        let btnClass = "";
                        if (isAdded) {
                          btnClass = "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/30";
                        } else if (isSurCommande) {
                          btnClass = "border-amber-200 bg-amber-50/30 hover:bg-amber-100 hover:border-amber-400";
                        } else if (isStandard) {
                          btnClass = "border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg";
                        } else {
                          // Spéciale
                          btnClass = "border-amber-200 bg-amber-50/30 hover:bg-amber-100 hover:border-amber-400";
                        }

                        return (
                          <motion.button
                            key={size.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.04 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onAdd(size)}
                            className={`relative py-5 px-2 rounded-2xl border-2 text-center font-bold text-sm transition-all overflow-hidden ${btnClass}`}
                          >
                            {!isAdded && (
                              <>
                                {isStandard ? (
                                  <span className="absolute top-0 left-0 bg-primary/10 text-primary text-[7px] font-black px-1.5 py-0.5 rounded-br-lg uppercase tracking-tighter">
                                    {t.shop.standard}
                                  </span>
                                ) : (
                                  <span className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase tracking-tighter">
                                    {t.shop.special}
                                  </span>
                                )}
                              </>
                            )}
                            {isAdded ? (
                              <span className="flex flex-col items-center gap-1">
                                <Check className="w-5 h-5" />
                                <span className="text-xs">{t.product.added}</span>
                              </span>
                            ) : (
                              <>
                                <span className="relative z-10 block font-black text-sm">{size.label}</span>
                                <span className={`block text-xs font-bold mt-1 relative z-10 transition-colors ${
                                  isAdded
                                    ? "text-white/95"
                                    : (isSurCommande || !isStandard)
                                      ? "text-amber-700 group-hover:text-amber-900"
                                      : "text-primary group-hover:text-primary-foreground"
                                }`}>
                                  {isSurCommande ? t.shop.onOrder : formatPrice(size.price)}
                                </span>
                              </>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────
export default function ProductCard({
  product,
  selectedDimension,
  selectedCategorie,
  selectedGamme,
  selectedFermete,
  onImageClick,
  onSelectGroup,
  verticalPlaceButtons,
}: ProductCardProps) {
  const { t, isRTL } = useLanguage();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [addedSize, setAddedSize] = useState<string | null>(null);
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

  const getGroupFromCategory = (value: string): OrderSizeGroup | null => {
    if (value === "1") return "1 Place";
    if (value === "1.5") return "1 Place et Demi";
    if (value === "2") return "2 Places";
    return null;
  };

  const handleSelectPlacesCategory = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    const group = getGroupFromCategory(category);

    if (onSelectGroup && group) {
      onSelectGroup(group);
      return;
    }

    const params = new URLSearchParams();
    if (selectedDimension && selectedDimension !== "Tous") {
      params.set("dimension", selectedDimension);
    }
    params.set("nbPlaces", category);
    navigate(`/produit/${product.slug}?${params.toString()}`);
  };

  // Find the right size to display
  let displaySize: any = null;
  const isSpecificDimension = selectedDimension && selectedDimension !== "Tous";

  if (isSpecificDimension) {
    displaySize = product.sizes?.find((s) => s.label === selectedDimension);
  }

  if (!displaySize && product.sizes && product.sizes.length > 0) {
    const nonZero = [...product.sizes]
      .filter((s) => s.price > 0)
      .sort((a, b) => a.price - b.price)[0];
    displaySize = nonZero || [...product.sizes].sort((a, b) => a.price - b.price)[0];
  }

  const availableSizes = (product.sizes || []).filter((s) => s.price > 0);

  const handleCartButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dimension déjà sélectionnée → ajout direct
    if (isSpecificDimension && displaySize) {
      handleAddToCart(displaySize);
      return;
    }
    // Une seule taille → ajout direct
    if (availableSizes.length === 1) {
      handleAddToCart(availableSizes[0]);
      return;
    }
    // Plusieurs tailles → ouvrir le modal
    setShowModal(true);
  };

  const handleAddToCart = (size: ProductSize) => {
    addItem(product as any, size);
    setAddedSize(size.label);
    setTimeout(() => {
      setAddedSize(null);
      setShowModal(false);
    }, 1200);
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="group bg-card rounded-2xl sm:rounded-[2rem] overflow-hidden border border-border shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer h-full flex flex-col relative"
        onClick={() => {
          let url = `/produit/${product.slug}`;
          if (selectedDimension && selectedDimension !== "Tous") {
            url += `?dimension=${encodeURIComponent(selectedDimension)}`;
          }
          navigate(url);
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden aspect-square sm:aspect-[4/3] bg-muted">
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent pointer-events-none sm:hidden" />

          {product.badge && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md shadow-md">
              {product.badge}
            </span>
          )}
          {product.inPromo && (
            <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-secondary text-secondary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md shadow-md">
              Promo
            </span>
          )}

          {/* Boutons flottants */}
          {displaySize && (
            <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/produit/${product.slug}${selectedDimension && selectedDimension !== "Tous" ? `?dimension=${encodeURIComponent(selectedDimension)}` : ''}`); }}
                className="p-2 sm:p-2.5 bg-card/90 text-foreground rounded-full shadow-lg active:scale-90 hover:bg-card transition-colors border border-border"
                title="Voir les détails"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={handleCartButtonClick}
                className="p-2 sm:p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg active:scale-90 hover:bg-primary/90 transition-colors"
                title="Ajouter au panier"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 capitalize tracking-wide">
            {product.categorie}
          </p>
          <h3 className="font-bold text-sm sm:text-lg leading-snug mb-1 line-clamp-2">
            {product.name}
          </h3>

          {!selectedDimension || selectedDimension === "Tous" ? (
            <div
              className={`${
                verticalPlaceButtons ? "flex flex-col gap-2" : "flex flex-wrap gap-1.5 mt-2"
              }`}
            >
              {[
                { value: "1", label: t.home.onePlace, title: t.home.onePlace },
                { value: "1.5", label: t.home.placeAndHalf, title: t.home.placeAndHalf },
                { value: "2", label: t.home.twoPlaces, title: t.home.twoPlaces },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={(e) => handleSelectPlacesCategory(e, option.value)}
                  className="w-full bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl hover:bg-primary/90 transition-colors hover-scale"
                  title={option.title}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-auto pt-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {displaySize ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline flex-wrap gap-x-1.5">
                    {!(isSpecificDimension && displaySize.price === 0) ? (
                      <span className="text-base sm:text-xl font-black text-primary whitespace-nowrap">
                        {!isSpecificDimension && (
                          <span className="text-xs sm:inline">{t.shop.from} </span>
                        )}
                        {formatPrice(displaySize.price)}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground italic">&nbsp;</span>
                    )}
                    {Number(displaySize.originalPrice) > 0 && displaySize.price !== 0 && (
                      <span className="text-xs sm:text-sm text-foreground line-through">
                        {formatPrice(displaySize.originalPrice)}
                      </span>
                    )}
                  </div>
                  {isSpecificDimension && displaySize.price !== 0 && (
                    <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="sm:inline text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Pour la dimension
                      </span>
                      <span className="bg-primary/10 text-primary text-[10px] sm:text-s font-black px-2 py-0.5 rounded-md border border-primary/20">
                        {selectedDimension}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-muted-foreground italic">
                  Prix sur demande
                </span>
              )}
            </div>

            {selectedDimension && selectedDimension !== "Tous" && (
              <div className="flex-shrink-0 self-center">
                {(() => {
                  const norm = normalizeDim(selectedDimension);
                  const matchedDim = dimensions.find((d) => normalizeDim(d.label) === norm);
                  const nbPlaces = matchedDim ? normalizeNbPlacesValue(matchedDim.nb_places) : null;
                  
                  const getPlacesFallback = (label: string) => {
                    const n = normalizeDim(label);
                    if (["90×190", "100×190"].includes(n)) return "1";
                    if (["120×190"].includes(n)) return "1.5";
                    return "2";
                  };

                  const val = nbPlaces || getPlacesFallback(selectedDimension);
                  const label = val === "1" ? "1 Place" : val === "1.5" ? "1 Place et Demi" : "2 Places";

                  return (
                    <span className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-2.5 py-1.5 rounded-md uppercase tracking-wider">
                      {label}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Tags */}
          {(selectedCategorie !== "Tous" && selectedCategorie) ||
          (selectedGamme !== "Tous" && selectedGamme) ||
          (selectedFermete !== "Tous" && selectedFermete) ? (
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border flex flex-wrap gap-1 sm:gap-1.5">
              {selectedCategorie && selectedCategorie !== "Tous" && product.categorie && (
                <span className="text-[9px] sm:text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-wider">
                  {product.categorie}
                </span>
              )}
              {selectedGamme && selectedGamme !== "Tous" && product.gamme && (
                <span className="text-[9px] sm:text-[10px] bg-secondary text-secondary-foreground border border-secondary-foreground/10 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-wider">
                  {product.gamme}
                </span>
              )}
              {selectedFermete && selectedFermete !== "Tous" && product.fermete && (
                <span className="text-[9px] sm:text-[10px] bg-accent text-accent-foreground border border-accent-foreground/10 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-wider">
                  {product.fermete}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border flex flex-wrap gap-1 sm:gap-1.5">
              {product.fermete && (
                <span className="text-[9px] sm:text-[10px] bg-accent text-accent-foreground font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider">
                  {product.fermete}
                </span>
              )}
              {product.gamme && (
                <span className="text-[9px] sm:text-[10px] bg-primary/90 text-secondary-foreground font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider">
                  {product.gamme}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal de sélection de dimension */}
      {showModal && (
        <DimensionModal
          product={product}
          onClose={() => { setShowModal(false); setAddedSize(null); }}
          onAdd={handleAddToCart}
          addedSize={addedSize}
        />
      )}
    </>
  );
}