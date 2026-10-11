import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Allow model-viewer element in this TSX file
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ProductSize, useProduct } from "@/hooks/useProducts";
import { useGammes } from "@/hooks/useGammes";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { useSettings } from "@/hooks/useSettings";
import { api } from "@/lib/apiClient";
import { Star, Shield, Truck, CreditCard, ChevronLeft, ChevronRight, Plus, Minus, Check, Loader2, Play, Gift, Phone } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ResponsiveImage from "@/components/ResponsiveImage";
import { getImageUrl } from "@/utils/imageUtils";
import { trackViewContent, trackAddToCart } from "@/services/metaPixel";
import { trackGAContactClick, trackGAViewItem } from "@/services/analytics";
import LucideIcon from "@/components/common/LucideIcon";
import OrderModal, { OrderSizeGroup } from "@/components/OrderModal";
import OrderAdvanceAlert from "@/components/OrderAdvanceAlert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { useDimensions } from "@/hooks/useDimensions";

const normalizeDimensionLabel = (label: string | undefined | null) => {
  if (!label) return "";
  return label.toString().replace(/\s*[x×]\s*/gi, "×").trim();
};

type DimensionTypeFilter = "all" | "standard" | "special";

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

const normalizeNbPlacesValue = (value: string | null | undefined) => {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return null;
  if (parsed === 1) return "1";
  if (parsed === 2) return "2";
  if (parsed === 1.5) return "1.5";

  return normalized;
};

const getVisibleSizes = (
  sizes: any[],
  dimensions: any[],
  selectedNbPlaces: string | null,
  selectedDimensionType: DimensionTypeFilter = "all"
) => {
  return sizes.filter((size: any) => {
    const matchingDimension = dimensions.find(
      (dimension: any) => normalizeDimensionLabel(dimension.label) === normalizeDimensionLabel(size.label)
    );

    if (selectedNbPlaces &&
      (!matchingDimension || normalizeNbPlacesValue(String(matchingDimension.nb_places)) !== selectedNbPlaces)
    ) {
      return false;
    }

    if (selectedDimensionType !== "all") {
      const isStandard = matchingDimension
        ? normalizeBooleanValue(matchingDimension.is_standard)
        : true;
      if ((selectedDimensionType === "standard") !== isStandard) return false;
    }

    return true;
  });
};

const hasPlaceOptionsForProduct = (sizes: any[], dimensions: any[]) => {
  return sizes.some((size: any) => {
    const matchingDimension = dimensions.find((dimension: any) => normalizeDimensionLabel(dimension.label) === normalizeDimensionLabel(size.label));
    return matchingDimension && normalizeNbPlacesValue(matchingDimension.nb_places) !== null;
  });
};

function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const thumbsRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  // Garde la miniature active visible dans la bande (sans faire défiler la page)
  useEffect(() => {
    const box = thumbsRef.current;
    const btn = thumbRefs.current[index];
    if (!box || !btn) return;
    box.scrollTo({
      left: btn.offsetLeft - box.clientWidth / 2 + btn.clientWidth / 2,
      behavior: "smooth",
    });
  }, [index]);

  return (
    <div
      dir="ltr"
      tabIndex={0}
      onKeyDown={(e) => {
        if (total < 2) return;
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
      className="space-y-3 outline-none"
    >
      {/* Grande image */}
      <div className="group relative aspect-square bg-muted rounded-3xl overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            drag={total > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -500) next();
              else if (info.offset.x > 70 || info.velocity.x > 500) prev();
            }}
            style={{ touchAction: "pan-y" }}
            className="absolute inset-0"
          >
            <ResponsiveImage
              imagePath={images[index]}
              width={1200}
              widths={[384, 768, 1200, 1600]}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={`${name} ${index + 1}`}
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <>
            {/* Compteur */}
            <span className="absolute bottom-4 left-4 z-10 rounded-full bg-background/85 backdrop-blur px-3 py-1 text-xs font-bold tabular-nums shadow-sm">
              {index + 1} / {total}
            </span>

            {/* Flèches */}
            <button
              type="button"
              onClick={prev}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/85 backdrop-blur shadow flex items-center justify-center transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-background"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/85 backdrop-blur shadow flex items-center justify-center transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-background"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Petites images */}
      {total > 1 && (
        <div
          ref={thumbsRef}
          className="relative flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              onClick={() => setIndex(i)}
              aria-label={`Voir l'image ${i + 1}`}
              aria-current={i === index}
              className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === index
                  ? "border-primary"
                  : "border-border opacity-70 hover:opacity-100 hover:border-primary/50"
                }`}
            >
              <ResponsiveImage
                imagePath={img}
                width={96}
                widths={[96, 192, 384]}
                sizes="80px"
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProduitDetail() {
  const { t, isRTL } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const { product, isLoading } = useProduct(slug);
  const { data: gammes } = useGammes();
  const { settings } = useSettings();
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [pendingOrderSize, setPendingOrderSize] = useState<ProductSize | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Reviews state (moved up so hooks order is stable)
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.profile?.phone || "", city: "", message: "" })
  const [reviewRating, setReviewRating] = useState<number>(5)
  const [reviewsPageIndex, setReviewsPageIndex] = useState(0)
  const [expandedReviews, setExpandedReviews] = useState<number[]>([])
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const dimensions = useDimensions()
  const [submittingReview, setSubmittingReview] = useState(false)
  const [selectedNbPlaces, setSelectedNbPlaces] = useState<string | null>(null)
  const [selectedDimensionType, setSelectedDimensionType] = useState<DimensionTypeFilter>("all")
  const hasPlaceOptions = Boolean(product && hasPlaceOptionsForProduct(product.sizes, dimensions));

  const TUNIS_CITIES = [
    "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef",
    "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Sousse", "Monastir", "Mahdia", "Sfax", "Gafsa",
    "Tozeur", "Kebili", "Gabès", "Médenine", "Tataouine"
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderModalGroup, setOrderModalGroup] = useState<OrderSizeGroup | null>(null);

  const getGroupFromNbPlaces = (value: string | null): OrderSizeGroup | null => {
    if (value === "1") return "1 Place";
    if (value === "1.5") return "1 Place et Demi";
    if (value === "2") return "2 Places";
    return null;
  };

  const getGroupFromDimension = (label: string | null): OrderSizeGroup | null => {
    if (!label) return null;
    if (["90×190", "100×190"].includes(label)) return "1 Place";
    if (["120×190", "140×190"].includes(label)) return "1 Place et Demi";
    if (["140×190", "160×190", "160×200", "180×200"].includes(label)) return "2 Places";
    return null;
  };
  const previousNbPlaces = useRef<string | null>(null);
  useEffect(() => {
    const nbPlacesParam = normalizeNbPlacesValue(searchParams.get("nbPlaces"));
    setSelectedNbPlaces(nbPlacesParam);
  }, [searchParams]);

  // Track Meta Pixel ViewContent & GA4 view_item
  useEffect(() => {
    if (!product) return;
    const price = selectedSize?.price ?? (product.sizes?.[0]?.price || 0);
    const category = product.categorie;

    trackViewContent({
      id: product.id,
      name: product.name,
      price,
      category,
    });

    trackGAViewItem({
      id: product.id,
      name: product.name,
      price,
      category,
    });
  }, [product?.id]);

  // Set default size when product loads
  useEffect(() => {
    if (!product || product.sizes.length === 0) return;

    const filteredSizes = getVisibleSizes(
      product.sizes,
      dimensions,
      hasPlaceOptions ? selectedNbPlaces : null,
      hasPlaceOptions ? selectedDimensionType : "all"
    );

    if (filteredSizes.length === 0 && selectedDimensionType !== "all") return;
    const candidateSizes = filteredSizes.length > 0 ? filteredSizes : product.sizes;


    // Détecter changement du nombre de places
    const nbPlacesChanged =
      previousNbPlaces.current !== selectedNbPlaces;


    if (nbPlacesChanged) {
      previousNbPlaces.current = selectedNbPlaces;

      // Pointer automatiquement sur la première dimension disponible
      const firstNonZero = candidateSizes.find(
        (s: any) => s.price > 0
      );

      setSelectedSize(firstNonZero || candidateSizes[0]);

      return;
    }


    const dim =
      searchParams.get("dimension") ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("selectedDimension")
        : null);


    if (dim) {
      const found = candidateSizes.find(
        (s: any) => normalizeDimensionLabel(s.label) === normalizeDimensionLabel(dim)
      );

      if (found) {
        setSelectedSize(found);
        return;
      }
    }


    if (
      selectedSize &&
      candidateSizes.some(
        (s: any) => s.label === selectedSize.label
      )
    ) {
      return;
    }


    const firstNonZero = candidateSizes.find(
      (s: any) => s.price > 0
    );

    setSelectedSize(firstNonZero || candidateSizes[0]);

  }, [
    product,
    searchParams,
    dimensions,
    selectedNbPlaces,
    selectedDimensionType,
    hasPlaceOptions
  ]);

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setReviewForm(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.profile?.phone || prev.phone
      }));
    }
  }, [user]);

  // Fetch reviews when product changes
  useEffect(() => {
    const fetchReviews = async () => {
      if (!product) return
      try {
        setLoadingReviews(true)
        const res: any = await api.get(`/published-reviews?product_id=${product.id}`)
        if (res) {
          if (Array.isArray(res)) {
            setReviews(res)
            setAverageRating(null)
          } else {
            setReviews(res.reviews || [])
            setAverageRating(res.average ?? null)
          }
        }
      } catch (err) {
        console.error('Error fetching product reviews', err)
        setReviews([])
        setAverageRating(null)
      } finally {
        setLoadingReviews(false)
      }
    }

    fetchReviews()
  }, [product])

  useEffect(() => {
    const reviewsItemsPerPage = windowWidth < 768 ? 1 : 2
    const pageCount = Math.max(1, Math.ceil(reviews.length / reviewsItemsPerPage))
    if (reviewsPageIndex >= pageCount) {
      setReviewsPageIndex(0)
    }
  }, [reviews.length, reviewsPageIndex, windowWidth])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!product || !selectedSize) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t.product.notFound}</p>
          <button onClick={() => navigate("/boutique")} className="text-primary hover:underline">← {t.product.backToShop}</button>
        </div>
      </div>
    );
  }

  // Check if user is B2B
  const isB2B = false; // Will be set from profile context
  const displayPrice = isB2B && selectedSize.resellerPrice ? selectedSize.resellerPrice : selectedSize.price;
  const productGalleryImages = [product.image, ...product.images].filter(
    (image, index, images) =>
      Boolean(image) &&
      images.findIndex((candidate) => getImageUrl(candidate) === getImageUrl(image)) === index
  );

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmittingReview(true)
    try {
      await api.post('/reviews', {
        product_id: product?.id,
        rating: reviewRating,
        message: reviewForm.message,
        name: reviewForm.name,
        email: reviewForm.email,
        phone: reviewForm.phone,
        city: reviewForm.city,
      })
      setReviewForm({ name: user?.name || "", email: user?.email || "", phone: user?.profile?.phone || "", city: "", message: "" })
      setReviewRating(5)
      setShowReviewForm(false)
      // Refresh reviews
      const res: any = await api.get(`/published-reviews?product_id=${product?.id}`)
      if (res) {
        if (Array.isArray(res)) {
          setReviews(res)
        } else {
          setReviews(res.reviews || [])
          setAverageRating(res.average ?? null)
        }
      }
    } catch (err) {
      console.error('Error submitting review', err)
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleAddToCart = () => {
    addItem(product as any, selectedSize, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const visibleSizes = getVisibleSizes(
    product?.sizes || [],
    dimensions,
    hasPlaceOptions ? selectedNbPlaces : null,
    hasPlaceOptions ? selectedDimensionType : "all"
  );
  const dimensionTypeOptions: { value: DimensionTypeFilter; label: string }[] = [
    { value: "all", label: t.product.all },
    { value: "standard", label: t.shop.standard },
    { value: "special", label: t.shop.special },
  ];

  const handlePlacesSelection = (value: string | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (value) {
      nextParams.set("nbPlaces", value);
    } else {
      nextParams.delete("nbPlaces");
    }

    setSearchParams(nextParams, { replace: true });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <button onClick={() => {
        const dim = searchParams.get("dimension") || (typeof window !== 'undefined' ? sessionStorage.getItem("selectedDimension") : null);
        navigate(`/boutique${dim ? `?dimension=${encodeURIComponent(dim)}` : ''}`);
      }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> {t.product.backToShop}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ================= GALERIE ================= */}
        <ProductGallery
          key={product.id}
          images={productGalleryImages.length ? productGalleryImages : [product.image]}
          name={product.name}
        />
        {/* ================= FIN GALERIE ================= */}

        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">{product.categorie}</span>
            {product.badge && <span className="ml-2 bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">{product.badge}</span>}
            <div className="mt-2 flex items-center justify-between gap-3">
              <h1 className="min-w-0 text-3xl font-black md:text-4xl">{product.name}</h1>
              {settings.contact_phone && (
                <>
                  <a
                    href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                    onClick={() => trackGAContactClick("call", settings.contact_phone)}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-2 py-1.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10 sm:gap-1.5 sm:px-2.5 sm:text-xs lg:hidden"
                    dir="ltr"
                    aria-label={`Appeler ${settings.contact_phone}`}
                  >
                    <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {settings.contact_phone}
                  </a>
                  <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-lg font-bold text-primary lg:inline-flex" dir="ltr">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {settings.contact_phone}
                  </span>
                </>
              )}
            </div>
            {product.grammage && (
              <p className="text-lg font-black  mt-2 flex items-center gap-2">
                {t.product.supportsUpTo} <span className="text-red-600">{product.grammage} kg</span> {t.product.kgPerPerson}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {(() => {
                  const avg = averageRating ?? (reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : 0)
                  const rounded = Math.round((avg || 0) * 2) / 2
                  return [1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${i <= Math.ceil(rounded) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))
                })()}
              </div>
              {user ? (
                <span className="text-sm text-muted-foreground">({reviews.length} {t.product.reviews})</span>
              ) : (
                <span className="text-sm text-muted-foreground">{t.product.reviewsLabel}</span>
              )}
            </div>
          </div>

          <div className="bg-accent rounded-2xl p-4">
            <div className="flex items-baseline gap-2">
              {displayPrice === 0 ? (
                <span className="text-4xl font-black text-amber-600">{t.product.onOrder}</span>
              ) : (
                <span className="text-4xl font-black text-primary">{formatPrice(displayPrice)}</span>
              )}
              {Number(selectedSize.originalPrice) > 0 && selectedSize.price !== 0 && <span className="text-lg text-muted-foreground line-through">{formatPrice(selectedSize.originalPrice)}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t.product.priceForDimension} {selectedSize.label}</p>
            {isB2B && selectedSize.resellerPrice && <p className="text-xs text-primary font-bold mt-1">💼 Prix revendeur appliqué</p>}
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div>
            {hasPlaceOptions && (
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* col-md-7 */}
                <div className="min-w-0 md:col-span-7">
                  <h3 className="mb-3 text-sm font-bold whitespace-nowrap">
                    {searchParams.get("nbPlaces") ? t.product.category : t.product.choosePlaceCategory}
                  </h3>

                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                    {searchParams.get("nbPlaces") ? (
                      <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-xl border-2 border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                        {selectedNbPlaces === "1"
                          ? t.product.onePlace
                          : selectedNbPlaces === "1.5"
                            ? t.product.placeAndHalf
                            : selectedNbPlaces === "2"
                              ? t.product.twoPlaces
                              : selectedNbPlaces}
                      </span>
                    ) : (
                      [
                        { value: null, label: t.product.all },
                        { value: "1", label: t.product.onePlace },
                        { value: "1.5", label: t.product.placeAndHalf },
                        { value: "2", label: t.product.twoPlaces },
                      ].map((option) => (
                        <button
                          key={option.value ?? "tous"}
                          onClick={() => setSelectedNbPlaces(option.value)}
                          aria-pressed={selectedNbPlaces === option.value}
                          title={option.label}
                          className={`shrink-0 whitespace-nowrap rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${selectedNbPlaces === option.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                            }`}
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* col-md-5 */}
                <div className="min-w-0 md:col-span-5">
                  <h3 className="mb-3 text-sm font-bold whitespace-nowrap">{t.product.dimensionType}</h3>

                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                    {dimensionTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedDimensionType(option.value)}
                        aria-pressed={selectedDimensionType === option.value}
                        className={`shrink-0 whitespace-nowrap rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${selectedDimensionType === option.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary"
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-sm font-bold mb-3">{t.product.chooseSize}</h3>

            {visibleSizes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedNbPlaces && selectedDimensionType === "all"
                  ? t.product.noDimensionAvailable
                  : t.shop.noDimensions}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visibleSizes.map((size) => {
                  const isSelected = selectedSize?.label === size.label;
                  const isSurCommande = size.price === 0;
                  const dimension = dimensions.find(
                    (item) => normalizeDimensionLabel(item.label) === normalizeDimensionLabel(size.label)
                  );
                  const isStandard = dimension
                    ? normalizeBooleanValue(dimension.is_standard)
                    : true;

                  const baseClass = "relative grow px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all";
                  const selectedClass = isStandard
                    ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 shadow-md"
                    : "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2 shadow-md";
                  const normalClass = isStandard
                    ? "border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:shadow-md"
                    : "border-amber-200 bg-amber-50/30 text-amber-900 hover:border-amber-400 hover:bg-amber-100";

                  return (
                    <button
                      key={size.label}
                      onClick={() => {
                        if (!isStandard) {
                          setPendingOrderSize(size);
                          return;
                        }
                        setSelectedSize(size);
                      }}
                      aria-pressed={isSelected}
                      className={`${baseClass} ${isSelected ? selectedClass : normalClass}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{size.label}</span>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight ${isSelected
                              ? "bg-white/20 text-white"
                              : isStandard
                                ? "bg-primary/10 text-primary"
                                : "bg-amber-500 text-white"
                            }`}
                        >
                          {isStandard ? t.shop.standard : t.shop.special}
                        </span>
                      </span>

                      <span className="block text-xs mt-1 opacity-75">
                        {isSurCommande
                          ? t.product.onOrder
                          : formatPrice(size.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold mb-3">{t.product.quantity}</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label={`Diminuer ${t.product.quantity} pour ${product.name}`} className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary transition-colors"><Minus className="w-4 h-4" aria-hidden="true" /></button>
              <span className="text-lg font-bold w-8 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label={`Augmenter ${t.product.quantity} pour ${product.name}`} className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary transition-colors"><Plus className="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleAddToCart} className={`w-full font-bold py-4 rounded-2xl transition-all text-sm ${added ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {added ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> {t.product.added}</span> : t.product.addToCart}
            </button>
            <button
              onClick={() => {
                addItem(product as any, selectedSize, qty);
                navigate("/commander");
              }}
              className="w-full bg-secondary text-secondary-foreground font-bold py-4 rounded-2xl hover:bg-secondary/90 transition-colors text-sm"
            >
              {t.product.orderDirectly}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(() => {
              let trustBadges = [];
              try {
                trustBadges = JSON.parse(settings.trust_badges || "[]");
              } catch (e) {
                trustBadges = [];
              }
              if (!Array.isArray(trustBadges) || trustBadges.length === 0) {
                trustBadges = [
                  { icon: "Truck", title: "Livraison gratuite", sub: "Partout en Tunisie" },
                  { icon: "CreditCard", title: "Paiement à la livraison", sub: "Sans frais cachés" },
                  { icon: "ShieldCheck", title: "Garantie 10 ans", sub: "Sur tous nos matelas" },
                  { icon: "Clock", title: "Service client 24/7", sub: "+216 71 000 000" },
                ];
              }
              return trustBadges.slice(0, 4).map(({ icon, title, sub }, i) => (
                <div key={i} className="bg-muted rounded-xl p-3 text-center flex flex-col items-center justify-center">
                  <LucideIcon name={icon} className="w-5 h-5 mb-1 text-primary" />
                  <p className="text-[10px] font-bold leading-tight">{title}</p>
                  <p className="text-[9px] opacity-70 line-clamp-1">{sub}</p>
                </div>
              ));
            })()}
          </div>

          {(() => {
            const currentDim = dimensions.find(d => d.label === selectedSize.label);
            const sizeGifts = currentDim?.free_gifts || [];
            const hasGifts = sizeGifts.length > 0;
            const gamme = gammes?.find(g => g.name === product.gamme);
            const hasWarranty = gamme && gamme.warranty;

            if (!hasGifts && !hasWarranty) return null;

            return (
              <div className="border-t border-border pt-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{t.product.giftsAndWarranty}</h3>
                    <p className="text-xs text-muted-foreground">{t.product.includedOffers} ({selectedSize.label})</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* Gamme Warranty */}
                  {hasWarranty && (
                    <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-2xl border border-primary/20 animate-in fade-in zoom-in-95 duration-500">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Shield className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.product.warranty} {gamme.warranty} {t.product.warrantyYears}</p>
                        <p className="text-[10px] text-muted-foreground">{t.product.totalSerenity}</p>
                      </div>
                    </div>
                  )}

                  {/* Dimension Gifts */}
                  {sizeGifts.map((gift: any) => (
                    <div key={gift.id} className="flex items-center gap-3 bg-accent/30 p-3 rounded-2xl border border-primary/10 animate-in slide-in-from-bottom-2 duration-500">
                      {gift.image ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                          <ResponsiveImage
                            imagePath={gift.image}
                            width={384}
                            widths={[96, 192, 384]}
                            sizes="112px"
                            alt={gift.titre}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-6 h-6 text-primary/50" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold">{gift.titre}</p>
                        {gift.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{gift.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold mb-3">{t.product.specs}</h3>
            <ul className="space-y-2">
              {product.specs.map((spec) => (
                <li key={spec} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" />{spec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {(() => {
        const gamme = gammes?.find((g) => g.name === product.gamme);
        if (!gamme) return null;

        const videoUrl = gamme.video_url || null;
        // prefer GLB/GLTF assets for the 3D viewer
        const modelUrl = (gamme.images_3d || []).find((u: string) => /\.(glb|gltf)(\?|$)/i.test(u)) || (gamme.images_3d || [])[0] || null;

        if (!videoUrl && !modelUrl) return null;

        // Debug: log the raw and resolved URLs to help diagnose 404 /api/storage issues
        const resolvedModelUrl = modelUrl ? getImageUrl(modelUrl) : null;
        const resolvedVideoUrl = videoUrl ? getImageUrl(videoUrl) : null;
        // eslint-disable-next-line no-console
        console.debug('ProduitDetail media URLs', { modelUrl, resolvedModelUrl, videoUrl, resolvedVideoUrl });

        return (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Play className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-black">{t.product.multimediaSection} {gamme.name}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* 3D model (if available) */}
              {modelUrl && (
                <div className="bg-white border border-border rounded-2xl shadow-lg overflow-hidden h-80 flex items-center justify-center">
                  <model-viewer
                    src={getImageUrl(modelUrl)}
                    alt={`3D modèle gamme ${gamme.name}`}
                    poster={getImageUrl(gamme.photos?.[0]) || undefined}
                    shadow-intensity="1"
                    camera-controls
                    auto-rotate
                    interaction-prompt="auto"
                    style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                    camera-orbit="45deg 75deg 105%"
                    loading="eager"
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                  >
                    <button slot="ar-button" className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-2xl font-black text-xs">{t.product.viewInAR}</button>
                  </model-viewer>
                </div>
              )}

              {/* Video reel (if available) */}
              {videoUrl && (
                <div className="bg-white border border-border rounded-2xl shadow-lg overflow-hidden h-80 flex items-center justify-center">
                  <video
                    src={getImageUrl(videoUrl)}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    poster={getImageUrl(gamme.photos?.[0]) || undefined}
                  />
                </div>
              )}
            </div>
          </section>
        );
      })()}

      <section className=" py-24 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-primary uppercase tracking-widest">{t.product.testimonials}</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2">{t.product.clientReviews}</h2>
            {averageRating !== null && (
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-6 h-6 ${i <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                <span className="text-lg font-black text-primary ml-3">{averageRating}/5</span>
              </div>
            )}
          </motion.div>

          {!user && (
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">{t.product.loginToReview}</p>
            </div>
          )}

          {user && (
            <div className="text-center mb-6">
              <button onClick={() => setShowReviewForm(true)} className="text-sm text-primary font-black uppercase tracking-wider hover:underline">{t.product.giveReview}</button>
            </div>
          )}

          {/* Review Form Modal */}
          <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{t.product.leaveReview}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label htmlFor="review-full-name" className="text-sm font-bold mb-1 block">{t.product.fullName}</label>
                  <input id="review-full-name" value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="review-email" className="text-sm font-bold mb-1 block">{t.product.email}</label>
                    <input id="review-email" type="email" value={reviewForm.email} onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label htmlFor="review-phone" className="text-sm font-bold mb-1 block">{t.product.phone}</label>
                    <input id="review-phone" type="tel" value={reviewForm.phone} onChange={(e) => setReviewForm({ ...reviewForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label htmlFor="review-city" className="text-sm font-bold mb-1 block">{t.product.city}</label>
                  <select
                    id="review-city"
                    value={reviewForm.city}
                    onChange={(e) => setReviewForm({ ...reviewForm, city: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t.product.selectCity}</option>
                    {TUNIS_CITIES.sort().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold mb-2 block">{t.product.yourRating}</label>
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewRating(s)}
                        aria-label={`Attribuer ${s} étoile${s > 1 ? "s" : ""} sur 5`}
                        aria-pressed={reviewRating === s}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${s <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{t.product.ratingHelp}</p>
                </div>
                <div>
                  <label htmlFor="review-message" className="text-sm font-bold mb-1 block">{t.product.message}</label>
                  <textarea id="review-message" value={reviewForm.message} onChange={(e) => setReviewForm({ ...reviewForm, message: e.target.value })} required rows={5} className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <button type="button" onClick={() => setShowReviewForm(false)} className="bg-muted text-foreground font-bold px-6 py-2 rounded-2xl hover:bg-muted/80 transition-colors">{t.product.cancel}</button>
                  <button type="submit" disabled={submittingReview} className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{t.product.send}</button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="relative">
            {loadingReviews ? (
              <p className="text-sm text-muted-foreground text-center">{t.product.loadingReviews}</p>
            ) : (
              <>
                {reviews && reviews.length > 0 ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={reviewsPageIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                      >
                        {reviews.slice(reviewsPageIndex * (windowWidth < 768 ? 1 : windowWidth < 1024 ? 2 : 3), (reviewsPageIndex + 1) * (windowWidth < 768 ? 1 : windowWidth < 1024 ? 2 : 3)).map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -8 }}
                            className="bg-card rounded-[2rem] p-8 border border-border shadow-sm flex flex-col hover:shadow-xl transition-all"
                          >
                            <div className="flex items-center gap-1 mb-5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                            <div className="flex-1">
                              <p className={`text-base text-foreground/80 mb-4 italic leading-relaxed ${expandedReviews.includes(r.id) ? 'whitespace-pre-wrap' : 'line-clamp-4'}`}>"{r.message}"</p>
                              {r.message && r.message.length > 180 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedReviews(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]);
                                  }}
                                  className="text-sm font-bold text-primary hover:underline mb-4"
                                >
                                  {expandedReviews.includes(r.id) ? t.common.seeLess : t.common.seeMore}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-lg font-black shadow-inner">{r.name?.[0] || 'U'}</div>
                              <div>
                                <p className="text-base font-black truncate">{r.name || 'Utilisateur'}</p>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{r.city || ''}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>

                    {reviews.length > (windowWidth < 768 ? 1 : windowWidth < 1024 ? 2 : 3) && (
                      <div className="flex justify-center gap-3 mt-12">
                        {Array.from({ length: Math.ceil(reviews.length / (windowWidth < 768 ? 1 : windowWidth < 1024 ? 2 : 3)) }).map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setReviewsPageIndex(idx)}
                            className={`h-2 rounded-full transition-all ${reviewsPageIndex === idx ? 'w-12 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]' : 'w-2 bg-primary/20 hover:bg-primary/40'}`}
                            aria-label={`Page avis ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">{t.product.noReviews}</p>
                )}
              </>
            )}
          </div>
        </div>
      </section>
      <OrderModal
        product={product}
        open={orderModalOpen}
        onOpenChange={(open) => setOrderModalOpen(open)}
        sizeGroup={orderModalGroup ?? "1 Place"}
      />
      <OrderAdvanceAlert
        open={Boolean(pendingOrderSize)}
        onOpenChange={(open) => {
          if (!open) setPendingOrderSize(null);
        }}
        onConfirm={() => {
          if (pendingOrderSize) setSelectedSize(pendingOrderSize);
          setPendingOrderSize(null);
        }}
      />
    </main>

  );
}