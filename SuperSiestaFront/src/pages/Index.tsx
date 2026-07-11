import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, Shield, Truck, Clock, CreditCard,
  ChevronRight, Loader2, ArrowRight, ChevronDown, Send,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts, useCategories, Product } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import OrderModal, { OrderSizeGroup } from "@/components/OrderModal";
import HeroSlider from "@/components/HeroSlider";
import ThreeDShowcase from "@/components/ThreeDShowcase";
import { api } from "@/lib/apiClient";

import { useHeroSlides } from "@/hooks/useHeroSlides";
import { getImageUrl } from "@/utils/imageUtils";
import { useSettings } from "@/hooks/useSettings";
import { useNewsletters } from "@/hooks/useNewsletters";
import { useSocialNetworks } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";
import { useBlogPosts } from "@/hooks/useBlog";

interface BlogPreview {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  published_at: string | null;
}

export default function Index() {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { allDimensions } = useCategories(products);
  const allProducts = (products || []).filter(p => p.sizes && p.sizes.length > 0).slice(0, 6);

  const [showAllDimensions, setShowAllDimensions] = useState(false);
  const { settings } = useSettings();

  // ÉTATS DYNAMIQUES VIA REACT QUERY
  const { data: heroSlides = [], isLoading: slidesLoading } = useHeroSlides(true);

  // ÉTATS POUR LES GAMMES ET DIMENSIONS
  const [blogPageIndex, setBlogPageIndex] = useState(0);
  const [reviewsPageIndex, setReviewsPageIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<number[]>([]);
  const [gammes, setGammes] = useState<any[]>([]);
  const [dbDimensions, setDbDimensions] = useState<{ id: string, label: string, is_standard: boolean }[]>([]);
  const [categories, setCategories] = useState<{ id: string, label: string, image: string | null, description: string | null, color: string | null, text_color: string | null }[]>([]);
  const [dynamicReviews, setDynamicReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const { subscribe, isSubscribing } = useNewsletters();
  const { socials } = useSocialNetworks();

  const { data: blogPosts = [] } = useBlogPosts();
  const { data: favoritePosts = [] } = useBlogPosts({ is_favorite: true });

  const [promoIndex, setPromoIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalGroup, setModalGroup] = useState<OrderSizeGroup>("1 Place");

  const normalizeDimensionLabel = (label: string | undefined | null) => {
    if (!label) return "";
    return label.toString().replace(/\s*[x×]\s*/gi, "×").trim();
  };

  const getBestGroupForProduct = (product: Product): OrderSizeGroup => {
    const labels = product.sizes.map((size) => normalizeDimensionLabel(size.label));
    if (labels.some((label) => ["90×190", "100×190"].includes(label))) return "1 Place";
    if (labels.some((label) => ["120×190", "140×190"].includes(label))) return "1 Place et Demi";
    return "2 Places";
  };

  let promoCardsList: any[] = [];
  try {
    promoCardsList = JSON.parse(settings?.promo_cards || "[]");
  } catch(e) {}
  if (!Array.isArray(promoCardsList) || promoCardsList.length === 0) {
    promoCardsList = [{
      id: 'default',
      badge: 'OFFRE LIMITÉE',
      title: "Jusqu'à -20% sur les top modèles",
      description: "Profitez de nos meilleures offres sur les matelas Top Relax et Tendresse pour des nuits inoubliables.",
      link_text: "Profiter de l'offre",
      link_url: "/boutique",
      image: "/images/TopRelax-1.jpg"
    }];
  }

  // Autoplay pour le carrousel promo
  useEffect(() => {
    if (promoCardsList.length <= 1) return;
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promoCardsList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [promoCardsList.length]);

  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const blogItemsPerPage = 3;
  const reviewsItemsPerPage = windowWidth < 768 ? 1 : 3;

  // CHARGEMENT DES AUTRES DONNÉES
  useEffect(() => {
    const fetchGammes = async () => {
      try {
        const data = await api.get<any[]>("/gammes");
        const sorted = (data || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
        setGammes(sorted);
      } catch (err) {
        console.error("Erreur gammes:", err);
      }
    };
    const fetchDimensions = async () => {
      try {
        const data = await api.get<{ id: string, label: string, is_standard: boolean }[]>("/dimensions");
        setDbDimensions(data || []);
      } catch (err) {
        console.error("Erreur dimensions:", err);
      }
    };
    const fetchCategories = async () => {
      try {
        const data = await api.get<any[]>("/categories");
        const sorted = (data || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        setCategories(sorted);
      } catch (err) {
        console.error("Erreur categories:", err);
      }
    };
    const fetchReviews = async () => {
      try {
        const res = await api.get<{ reviews: any[], average: number }>("/published-reviews");
        if (res) {
          setDynamicReviews(res.reviews || []);
          setAverageRating(res.average || 5.0);
        }
      } catch (err) {
        console.error("Erreur reviews:", err);
      }
    };

    fetchGammes();
    fetchDimensions();
    fetchCategories();
    fetchReviews();
  }, []);

  const reviewsList = dynamicReviews;

  // Autoplay pour le carrousel des blogs favoris
  useEffect(() => {
    if (favoritePosts.length <= blogItemsPerPage) return;
    const interval = setInterval(() => {
      setBlogPageIndex((prev) => (prev + 1) % Math.ceil(favoritePosts.length / blogItemsPerPage));
    }, 8000); 
    return () => clearInterval(interval);
  }, [favoritePosts.length, blogItemsPerPage]);

  // Autoplay pour le carrousel des avis
  useEffect(() => {
    if (reviewsList.length <= reviewsItemsPerPage) return;
    const interval = setInterval(() => {
      setReviewsPageIndex((prev) => (prev + 1) % Math.ceil(reviewsList.length / reviewsItemsPerPage));
    }, 10000);
    return () => clearInterval(interval);
  }, [reviewsList.length, reviewsItemsPerPage]);

  // Précharger les images quand les slides arrivent
  useEffect(() => {
    if (heroSlides.length > 0) {
      heroSlides.slice(0, 2).forEach(slide => {
        const img = new Image();
        img.src = slide.image_url;
      });
    }
  }, [heroSlides]);

  const standardDimensionLabels = dbDimensions.filter(d => d.is_standard).map(d => d.label);
  const allApiDimensions = dbDimensions.map(d => d.label);

  const finalStandard = standardDimensionLabels.length > 0 ? standardDimensionLabels : allApiDimensions.slice(0, 3);
  const finalExtra = allApiDimensions.filter(d => !finalStandard.includes(d));

  const visibleDimensions = showAllDimensions ? [...finalStandard, ...finalExtra] : finalStandard;

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    },
    viewport: { once: true }
  };

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

  const collectionsRef = useRef<HTMLDivElement>(null);
  const [activeCollectionDot, setActiveCollectionDot] = useState(0);

  const handleCollectionsScroll = () => {
    if (collectionsRef.current && categories.length > 5) {
      const scrollLeft = collectionsRef.current.scrollLeft;
      // Largeur moyenne d'un item + gap pour le calcul du point actif
      const itemWidth = 280; 
      const index = Math.round(scrollLeft / itemWidth);
      setActiveCollectionDot(index);
    }
  };

  const scrollToCollection = (targetIdx: number) => {
    if (collectionsRef.current) {
      const itemWidth = 280;
      collectionsRef.current.scrollTo({
        left: targetIdx * itemWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    try {
      await subscribe(newsletterEmail);
      toast.success("Succès !", {
        description: "Vous êtes maintenant inscrit à notre newsletter."
      });
      setNewsletterEmail("");
    } catch (err: any) {
      const message = err.response?.data?.message || "Une erreur est survenue lors de l'inscription.";
      toast.error("Erreur", {
        description: message
      });
    }
  };

const [carouselIndex, setCarouselIndex] = useState(0);
const [isPaused, setIsPaused] = useState(false);

useEffect(() => {
  const handleResize = () => setWindowWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

useEffect(() => {
  setCarouselIndex(0);
}, [windowWidth < 640, windowWidth < 1024]);

// Défilement automatique, un item à la fois
useEffect(() => {
  if (gammes.length <= 1 || isPaused) return;

  const timer = setInterval(() => {
    setCarouselIndex((prev) => (prev + 1) % gammes.length);
  }, 3500);

  return () => clearInterval(timer);
}, [gammes.length, isPaused]);




  return (
    <main className="overflow-hidden">
      {/* HERO SLIDER FULL WIDTH */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden"
      >
        <div className="relative min-h-[400px] md:min-h-[600px] bg-muted/20">
          {slidesLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <HeroSlider slides={heroSlides} />
          )}
        </div>
      </motion.section>

{/* FLOAT CARD FAVORITES OVER HERO */}
{favoritePosts.length > 0 && (() => {
  const itemsPerView = Math.min(windowWidth < 640 ? 1 : 3, favoritePosts.length);

  // Fenêtre glissante circulaire (comme le carrousel des gammes)
  const currentPosts = Array.from({ length: itemsPerView }, (_, i) =>
    favoritePosts[(blogPageIndex + i) % favoritePosts.length]
  );

  const isActiveThumb = (idx: number) => {
    for (let i = 0; i < itemsPerView; i++) {
      if ((blogPageIndex + i) % favoritePosts.length === idx) return true;
    }
    return false;
  };

  return (
    <div className="relative z-20 max-w-9xl mx-auto px-2 -mt-48 md:-mt-[29rem] mb-26 pointer-events-none">      <div className="flex justify-center md:justify-end pr-0 md:pr-10">
      <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="w-full max-w-[400px] bg-background border border-border rounded-2xl p-5 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.2)] pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                Nos conseils
              </h3>
              <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                {Math.floor(blogPageIndex / itemsPerView) + 1}/{Math.ceil(favoritePosts.length / itemsPerView)}
              </span>
            </div>
            {/* Articles actifs (fenêtre de 1 sur mobile, 3 sur desktop) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={blogPageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="divide-y divide-border/60 mb-4"
              >
                {currentPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group flex gap-3 items-center py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted/50">
                      {post.image_url ? (
                        <img
                          src={getImageUrl(post.image_url)}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-black text-sm">★</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[8px] font-black uppercase px-1.5 py-0.5 rounded mb-1 ${post.category === 'conseil' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {post.category || 'Article'}
                      </span>
                      <h4 className="font-bold text-xs leading-snug group-hover:text-primary transition-colors line-clamp-2 tracking-tight">
                        {post.title}
                      </h4>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Bande de miniatures = TOUS les articles */}
            {favoritePosts.length > itemsPerView && (
              <div className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto pb-1 mb-4 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {favoritePosts.map((post, idx) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setBlogPageIndex(idx)}
                    className={`relative flex-1 min-w-[2.5rem] max-w-[3rem] aspect-square shrink-0 rounded-lg overflow-hidden border transition-all ${
                      isActiveThumb(idx)
                        ? "border-primary ring-2 ring-primary/20 ring-offset-1 ring-offset-background shadow-sm"
                        : "border-border/70 opacity-55 hover:opacity-85"
                    }`}
                    aria-label={post.title}
                  >
                    {post.image_url ? (
                      <img src={getImageUrl(post.image_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground/50">
                        ★
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* CTA */}
            <Link
              to="/blog"
              className="w-full py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              Tous les articles <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        </div>
      </div>
    );
})()}
      {/* CHOISISSEZ VOTRE MATELAS */}
      <motion.section
        {...fadeInUp}
        className="bg-muted/30 py-14 sm:py-20"
      >
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="text-center mb-8 sm:mb-12"
          >
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Nos Gammes</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mt-1">Choisissez votre matelas</h2>
            <p className="text-muted-foreground text-sm mt-1">Sélectionnez le format souhaité et commandez en quelques clics</p>
          </motion.div>

          {productsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
            >
              {(products || []).filter(p => p.sizes && p.sizes.length > 0).map((p) => (
                <motion.div key={p.id} variants={fadeInUp}>
                  <ProductCard
                    product={p}
                    onSelectGroup={(group) => {
                      setModalProduct(p);
                      setModalGroup(group);
                      setModalOpen(true);
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>
{/* GAMMES EDITORIAL CAROUSEL */}
{gammes.length > 0 && (() => {
  const itemsPerPage = windowWidth < 640 ? 2 : windowWidth < 1024 ? 3 : 5;
  const canScroll = gammes.length > itemsPerPage;

  // Fenêtre glissante circulaire : avance d'1 item à la fois
  const visibleGammes = Array.from({ length: Math.min(itemsPerPage, gammes.length) }, (_, i) =>
    gammes[(carouselIndex + i) % gammes.length]
  );

  const goToIndex = (idx: number) => {
    setIsPaused(true);
    setCarouselIndex(((idx % gammes.length) + gammes.length) % gammes.length);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50;
    const { offset, velocity } = info;

    if (offset.x < -swipeThreshold || velocity.x < -500) {
      goToIndex(carouselIndex + 1);
    } else if (offset.x > swipeThreshold || velocity.x > 500) {
      goToIndex(carouselIndex - 1);
    } else {
      setIsPaused(false);
    }
  };

return (
  <motion.section
    {...fadeInUp}
    className="py-4 sm:py-4 bg-background border-b border-border"
  >
    <div className="max-w-7xl mx-auto px-4">
      {/* Carrousel */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={carouselIndex}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragStart={() => setIsPaused(true)}
            onDragEnd={handleDragEnd}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {visibleGammes.map((g, i) => {
              const handleNavigate = () => {
                const matched = (products || []).filter(p => (p.gamme || '') === g.name);
                if (matched.length === 1 && matched[0].slug) {
                  navigate(`/produit/${matched[0].slug}`);
                } else {
                  navigate(`/boutique?gamme=${encodeURIComponent(g.name)}`);
                }
              };

              return (
                <motion.div
                  key={g.id}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-full h-full flex flex-col select-none group"
                >
                  <button type="button" onClick={handleNavigate} className="w-full text-left">
                    <div className="w-full aspect-square relative overflow-hidden rounded-lg border border-border/70">
                      {g.cover_image ? (
                        <img
                          src={getImageUrl(g.cover_image)}
                          alt={g.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground text-center">Sans image</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="pt-3 sm:pt-4 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="block w-6 h-[2px] bg-primary mb-1.5 sm:mb-2" />
                      <button
                        type="button"
                        onClick={handleNavigate}
                        className="text-xs sm:text-sm font-bold text-left leading-tight line-clamp-2 group-hover:text-primary transition-colors"
                      >
                        {g.name}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleNavigate}
                      aria-label={`Découvrir ${g.name}`}
                      className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Flèches + Dots (PC et mobile) */}
      {canScroll && (
        <div className="flex items-center justify-center gap-4 mt-6 sm:mt-8">
          <button
            type="button"
            onClick={() => goToIndex(carouselIndex - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex-shrink-0"
            aria-label="Gamme précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-2 flex-wrap justify-center max-w-full">
            {gammes.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToIndex(idx)}
                className={`h-2.5 rounded-full transition-all flex-shrink-0 ${
                  carouselIndex === idx
                    ? 'w-10 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    : 'w-2.5 bg-primary/20 hover:bg-primary/40'
                }`}
                aria-label={`Aller à la gamme ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToIndex(carouselIndex + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex-shrink-0"
            aria-label="Gamme suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  </motion.section>
);
})()}
      {/* TRUST BADGES */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
        className="bg-primary text-primary-foreground py-10"
      >
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {trustBadges.map(({ icon, title, sub }, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="flex flex-col items-center gap-3"
            >
              <div className="p-3 bg-white/10 rounded-2xl">
                <LucideIcon name={icon} className="w-7 h-7" />
              </div>
              <p className="font-bold text-sm tracking-tight">{title}</p>
              <p className="text-xs opacity-80">{sub}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* DIMENSION GUIDE */}
      <motion.section
        {...fadeInUp}
        className="max-w-7xl mx-auto px-4 py-14"
      >
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Guide rapide</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 mb-2">Choisissez votre dimension</h2>
          <p className="text-muted-foreground text-sm">Sélectionnez la taille de votre matelas pour voir les modèles disponibles</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <motion.div
            layout
            className={`grid grid-cols-3 ${
              showAllDimensions 
                ? 'sm:grid-cols-6 md:grid-cols-8' 
                : visibleDimensions.length === 7 ? 'sm:grid-cols-7'
                : visibleDimensions.length === 5 ? 'sm:grid-cols-5'
                : visibleDimensions.length === 8 ? 'sm:grid-cols-4 md:grid-cols-8'
                : 'sm:grid-cols-6'
            } gap-3`}
          >
            <AnimatePresence>
              {visibleDimensions.map((d, index) => {
                const available = allDimensions.includes(d);
                const isStandard = standardDimensionLabels.includes(d);
                return (
                  <motion.button
                    key={d}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      sessionStorage.setItem("selectedDimension", d);
                      navigate(`/boutique?dimension=${encodeURIComponent(d)}`);
                    }}
                    disabled={!available}
                    whileHover={available ? { scale: 1.05, y: -2 } : {}}
                    whileTap={available ? { scale: 0.95 } : {}}
                    className={`relative py-5 px-2 rounded-2xl border-2 text-center font-bold text-sm transition-all overflow-hidden ${available
                      ? isStandard
                        ? "border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg"
                        : "border-amber-200 bg-amber-50/30 hover:bg-amber-100 hover:border-amber-400"
                      : "border-border bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                      }`}
                  >
                    {!isStandard && available && (
                      <span className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase tracking-tighter">
                        Spéciale
                      </span>
                    )}
                    {isStandard && available && (
                      <span className="absolute top-0 left-0 bg-primary/10 text-primary text-[7px] font-black px-1.5 py-0.5 rounded-br-lg uppercase tracking-tighter">
                        Standard
                      </span>
                    )}
                    <span className="relative z-10">{d}</span>
                    {available && (
                      <span className="block text-[10px] font-normal mt-0.5 opacity-70 relative z-10">
                        {(products || []).filter(p => p.sizes.some(s => s.label === d)).length} modèles
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
          {finalExtra.length > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={() => setShowAllDimensions(!showAllDimensions)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllDimensions ? "rotate-180" : ""}`} />
                {showAllDimensions ? "Afficher moins" : "Afficher plus"}
              </button>
            </div>
          )}
        </div>
      </motion.section>



      {/* 3D SHOWCASE */}
      <ThreeDShowcase features={trustBadges} />

      {/* COLLECTIONS */}
      <motion.section
        {...fadeInUp}
        className="max-w-7xl mx-auto px-4 pb-8"
      >
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Explorez</span>
          <h2 className="text-2xl md:text-3xl font-black mt-1 mb-2">Nos Collections</h2>
        </div>
        <div className="relative group/carousel">
          <motion.div
            ref={collectionsRef}
            onScroll={handleCollectionsScroll}
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className={
              categories.length > 5
                ? "flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-2 px-2 -mx-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] transition-all scroll-smooth"
                : `grid grid-cols-1 gap-4 ${
                    categories.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto w-full' :
                    categories.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto w-full' :
                    categories.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
                    categories.length === 5 ? 'md:grid-cols-3 lg:grid-cols-5' :
                    'md:grid-cols-3'
                  }`
            }
          >
            {categories.length > 0 ? categories.map((c) => (
              <motion.button
                key={c.id}
                variants={fadeInUp}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => navigate(`/boutique?categorie=${encodeURIComponent(c.label)}`)}
                className={`rounded-2xl p-6 text-center shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] ${
                  categories.length > 5 ? 'min-w-[240px] max-w-[260px] snap-center shrink-0 flex-1' : 'w-full'
                }`}
                style={{ backgroundColor: c.color || '#f5f0eb', color: c.text_color || '#1a1a2e' }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ChevronRight className="w-10 h-10 rotate-[-45deg]" />
                </div>
                {c.image ? (
                  <img src={getImageUrl(c.image)} alt={c.label} className="w-16 h-16 object-contain mb-3 group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-16 h-16 bg-background/50 rounded-xl mb-3 flex items-center justify-center shadow-sm">
                    <span className="text-[10px] opacity-40">Plus</span>
                  </div>
                )}
                <h3 className="font-black text-base capitalize relative z-10">{c.label}</h3>
                <p className="text-xs opacity-70 relative z-10 max-w-[180px] line-clamp-1">{c.description}</p>
              </motion.button>
            )) : (
              <div className="col-span-full text-center py-6 text-muted-foreground w-full">Aucune collection disponible</div>
            )}
          </motion.div>

          {/* Dots Pagination - Seulement pour ce qui dépasse les 5 premiers */}
          {categories.length > 5 && (
            <div className="flex justify-center gap-2.5 mt-6">
              {/* Le point principal pour les 5 premiers */}
              <button
                onClick={() => scrollToCollection(0)}
                className={`h-1.5 rounded-full transition-all duration-500 ${activeCollectionDot < 5 ? 'w-10 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]' : 'w-2.5 bg-primary/20 hover:bg-primary/40'}`}
                title="Début"
              />
              {/* Les points pour les suivants */}
              {Array.from({ length: categories.length - 5 }).map((_, idx) => {
                const targetIdx = idx + 5;
                return (
                  <button
                    key={idx}
                    onClick={() => scrollToCollection(targetIdx)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${activeCollectionDot === targetIdx ? 'w-10 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]' : 'w-2.5 bg-primary/20 hover:bg-primary/40'}`}
                    title={`Collection ${targetIdx + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* BEST SELLERS */}
      <section className="bg-muted/50 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="flex items-center justify-between mb-8 sm:mb-12"
          >
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Populaires</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mt-1">Best Sellers</h2>
            </div>
            <Link to="/boutique" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
          {productsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8"
            >
              {allProducts.map((p) => (
                <motion.div key={p.id} variants={fadeInUp}>
                  <ProductCard
                    product={p}
                    verticalPlaceButtons
                    onImageClick={() => {
                      setModalProduct(p);
                      setModalGroup(getBestGroupForProduct(p));
                      setModalOpen(true);
                    }}
                    onSelectGroup={(group) => {
                      setModalProduct(p);
                      setModalGroup(group);
                      setModalOpen(true);
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
      {modalProduct && (
        <OrderModal
          product={modalProduct}
          open={modalOpen}
          onOpenChange={setModalOpen}
          sizeGroup={modalGroup}
        />
      )}
      {/* PROMO BANNER CAROUSEL */}
      <motion.section
        {...fadeInUp}
        className="max-w-7xl mx-auto px-4 py-10 md:py-16"
      >
        <div className="relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-secondary text-secondary-foreground shadow-2xl shadow-secondary/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={promoIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="relative flex flex-col lg:flex-row items-center gap-6 p-6 sm:p-10 lg:p-16 pb-14 sm:pb-16 lg:pb-16"
            >
              {/* Background watermark image */}
              <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
                <img src={getImageUrl(promoCardsList[promoIndex]?.image)} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Text content */}
              <div className="relative z-10 flex-1 w-full">
                <motion.span
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  className="inline-block bg-primary text-primary-foreground text-[10px] sm:text-xs font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-full uppercase tracking-widest"
                >
                  {promoCardsList[promoIndex]?.badge || "OFFRE"}
                </motion.span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mt-4 mb-3 leading-tight">
                  {promoCardsList[promoIndex]?.title}
                </h2>
                <p className="text-secondary-foreground/80 mb-6 text-sm sm:text-base lg:text-lg max-w-lg leading-relaxed">
                  {promoCardsList[promoIndex]?.description}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(promoCardsList[promoIndex]?.link_url || "/boutique")}
                  className="bg-primary text-primary-foreground font-black px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-xl sm:rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 text-sm sm:text-base w-fit"
                >
                  {promoCardsList[promoIndex]?.link_text || "Profiter de l'offre"} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              </div>

              {/* Side image — visible from lg */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: 5 }}
                whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                className="relative z-10 hidden lg:block flex-shrink-0"
              >
                <img
                  src={getImageUrl(promoCardsList[promoIndex]?.image)}
                  alt={promoCardsList[promoIndex]?.title}
                  className="w-72 xl:w-80 h-52 xl:h-60 object-cover rounded-3xl shadow-2xl border-4 border-white/20"
                />
              </motion.div>

              {/* Mobile image square */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="relative z-10 block lg:hidden w-full aspect-square max-h-64"
              >
                <img
                  src={getImageUrl(promoCardsList[promoIndex]?.image)}
                  alt={promoCardsList[promoIndex]?.title}
                  className="w-full h-full object-cover rounded-2xl shadow-lg border-2 border-white/10"
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {promoCardsList.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
              {promoCardsList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPromoIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    promoIndex === idx ? "w-8 bg-primary" : "w-2 bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Aller à l'offre ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* REVIEWS */}
      <section className="bg-muted/50 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl font-black mt-2">Ce que disent nos clients</h2>
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-6 h-6 ${i <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
              <span className="text-lg font-black text-primary ml-3">{averageRating}/5</span>
            </div>
          </motion.div>
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={reviewsPageIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                {reviewsList.slice(reviewsPageIndex * reviewsItemsPerPage, (reviewsPageIndex + 1) * reviewsItemsPerPage).map((r, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
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
                      {r.message.length > 180 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedReviews(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]);
                          }}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          {expandedReviews.includes(r.id) ? 'Voir moins' : 'Voir plus'}
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

            {reviewsList.length > reviewsItemsPerPage && (
              <div className="flex justify-center gap-3 mt-12">
                {Array.from({ length: Math.ceil(reviewsList.length / reviewsItemsPerPage) }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReviewsPageIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-500 ${reviewsPageIndex === idx ? "w-12 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "w-2 bg-primary/20 hover:bg-primary/40"}`}
                  />
                ))}
              </div>
            )}

            {reviewsList.length === 0 && (
              <div className="py-12 text-center text-muted-foreground italic">
                Aucun témoignage disponible pour le moment.
              </div>
            )}
          </div>
        </div>
      </section>

{/* LATEST BLOG POSTS CARDS */}
{blogPosts.length > 0 && (
  <section className="max-w-7xl mx-auto px-4 py-12 md:py-20">
    <motion.div
      {...fadeInUp}
      className="flex items-end justify-between mb-8 md:mb-12"
    >
      <div>
        <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest">
          Le Mag Super Siesta
        </span>

        <h2 className="text-2xl md:text-4xl font-black mt-1">
          Derniers Conseils & Actualités
        </h2>
      </div>

      <Link
        to="/blog"
        className="flex items-center gap-1 text-xs md:text-sm font-bold text-primary hover:underline whitespace-nowrap"
      >
        Voir tout
        <ChevronRight className="w-4 h-4" />
      </Link>
    </motion.div>

    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="whileInView"
      viewport={{ once: true }}
      className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8"
    >
      {blogPosts.map((post) => (
        <motion.div key={post.id} variants={fadeInUp}>
          <Link
            to={`/blog/${post.slug}`}
            className="group flex flex-col h-full overflow-hidden rounded-3xl bg-card border border-border shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* IMAGE */}
            <div className="relative overflow-hidden">
              <div className="aspect-[4/3] md:aspect-square">
                {post.image_url ? (
                  <img
                    src={getImageUrl(post.image_url)}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Star className="w-10 h-10 text-muted-foreground opacity-20" />
                  </div>
                )}
              </div>

              {/* Catégorie */}
              <div className="absolute top-3 left-3">
                <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[9px] md:text-[10px] font-black uppercase text-primary shadow">
                  {post.category}
                </span>
              </div>
            </div>

            {/* CONTENU */}
            <div className="flex flex-col flex-1 p-4 md:p-8">
              <h3 className="font-black text-sm md:text-xl leading-snug md:leading-tight break-words group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="mt-3 text-[11px] md:text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {post.excerpt}
              </p>

              {/* Bouton */}
              <div className="mt-auto pt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 md:px-5 md:py-2.5 text-[11px] md:text-sm font-bold text-primary transition-all group-hover:bg-primary group-hover:text-white">
                  <span>Lire l'article</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  </section>
)}

      {/* NEWSLETTER */}
      <motion.section
        {...fadeInUp}
        className="max-w-7xl mx-auto px-4 py-20"
      >
        <div className="relative overflow-hidden bg-accent rounded-[3rem] p-12 md:p-20 text-center shadow-xl">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-accent-foreground relative z-10 leading-tight">Restez informé de nos offres</h2>
          <p className="text-muted-foreground mb-10 text-base md:text-lg max-w-2xl mx-auto relative z-10">Inscrivez-vous à notre newsletter et recevez nos meilleures promotions directement dans votre boîte mail.</p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto relative z-10" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="votre-email@gmail.com"
              className="flex-1 bg-white border-2 border-transparent rounded-2xl px-6 py-4 text-lg shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isSubscribing}
              className="bg-primary text-primary-foreground font-black px-8 py-4 rounded-2xl hover:bg-primary/90 transition-all text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 min-w-[160px]"
            >
              {isSubscribing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  S'inscrire <Send className="w-5 h-5 ml-1" />
                </>
              )}
            </motion.button>
          </form>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent-foreground/5 rounded-full blur-3xl" />
        </div>
      </motion.section>

      {/* WhatsApp floating */}
      <motion.a
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring" }}
        whileHover={{ scale: 1.2, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        href={socials.find(s => s.name.toLowerCase().includes('whatsapp') || s.icon.lucide_name.toLowerCase().includes('message'))?.url || `https://wa.me/${(settings.contact_phone || "21671000000").replace(/[^\d]/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-40 bg-green-500 text-white w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl hover:bg-green-600 transition-colors"
        title="Discutez avec nous sur WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.112 1.532 5.836L.057 23.999l6.352-1.656A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.851 0-3.576-.5-5.065-1.373l-.363-.215-3.768.987.997-3.641-.235-.375A9.958 9.958 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      </motion.a>
    </main>
  );
}
