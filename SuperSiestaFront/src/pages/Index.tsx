import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, Shield, Truck, Clock, CreditCard,
  ChevronRight, Loader2, ArrowRight, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";
import ThreeDShowcase from "@/components/ThreeDShowcase";
import { api } from "@/lib/apiClient";

import { useHeroSlides } from "@/hooks/useHeroSlides";
import { getImageUrl } from "@/utils/imageUtils";

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

  const [blogPosts, setBlogPosts] = useState<BlogPreview[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<BlogPreview[]>([]);
  const [showAllDimensions, setShowAllDimensions] = useState(false);

  // ÉTATS DYNAMIQUES VIA REACT QUERY
  const { data: heroSlides = [], isLoading: slidesLoading } = useHeroSlides(true);

  // ÉTATS POUR LES GAMMES ET DIMENSIONS
  const [blogPageIndex, setBlogPageIndex] = useState(0);
  const [gammes, setGammes] = useState<any[]>([]);
  const [dbDimensions, setDbDimensions] = useState<{ id: string, label: string, is_standard: boolean }[]>([]);
  const [categories, setCategories] = useState<{ id: string, label: string, image: string | null, description: string | null, color: string | null, text_color: string | null }[]>([]);
  const [dynamicReviews, setDynamicReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);

  // CHARGEMENT DES AUTRES DONNÉES
  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const data = await api.getBlogPosts({ per_page: 3 }) as BlogPreview[];
        setBlogPosts(data || []);
      } catch (err) {
        console.error("Erreur blog:", err);
      }
    };
    const fetchFavorites = async () => {
      try {
        const data = await api.getBlogPosts({ is_favorite: true, per_page: 5 }) as BlogPreview[];
        setFavoritePosts(data || []);
      } catch (err) {
        console.error("Erreur blogs favoris:", err);
      }
    };
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
        const data = await api.get<{ id: string, label: string, image: string | null, description: string | null, color: string | null, text_color: string | null }[]>("/categories");
        setCategories(data || []);
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

    fetchBlog();
    fetchFavorites();
    fetchGammes();
    fetchDimensions();
    fetchCategories();
    fetchReviews();
  }, []);

  // Autoplay pour le carrousel des blogs favoris (3 par 3)
  useEffect(() => {
    if (favoritePosts.length <= 3) return;
    const interval = setInterval(() => {
      setBlogPageIndex((prev) => (prev + 1) % Math.ceil(favoritePosts.length / 3));
    }, 8000); // Change toutes les 8 secondes
    return () => clearInterval(interval);
  }, [favoritePosts.length]);

  // Précharger les images quand les slides arrivent
  useEffect(() => {
    if (heroSlides.length > 0) {
      heroSlides.slice(0, 2).forEach(slide => {
        const img = new Image();
        img.src = slide.image_url;
      });
    }
  }, [heroSlides]);

  const reviewsList = dynamicReviews;

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

  return (
    <main className="overflow-hidden">
      {/* HERO SLIDER FULL WIDTH */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden"
      >
        <div className="relative min-h-[500px] md:min-h-[700px] bg-muted/20">
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
      {favoritePosts.length > 0 && (
        <div className="relative z-20 max-w-9xl mx-auto px-2 -mt-32 md:-mt-[29rem] mb-26 pointer-events-none">
          <div className="flex justify-center md:justify-end pr-0 md:pr-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="w-full max-w-[450px] bg-background/80 backdrop-blur-2xl border border-white/20 rounded-[3rem] p-8 md:p-10 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.2)] pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="font-black text-2xl tracking-tighter uppercase leading-none">
                    Nos <span className="text-primary italic">conseils</span>
                  </h3>
                </div>
              </div>

              <div className="min-h-[320px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={blogPageIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    {favoritePosts.slice(blogPageIndex * 3, (blogPageIndex + 1) * 3).map((post, i) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link
                          to={`/blog/${post.slug}`}
                          className="group flex gap-5 items-start transition-all"
                        >
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-border shadow-sm">
                            {post.image_url ? (
                              <img src={getImageUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground/30 font-black">★</div>
                            )}
                          </div>
                          <div className="flex-1 py-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${post.category === 'conseil' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {post.category || 'Article'}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm leading-[1.3] group-hover:text-primary transition-colors line-clamp-2 tracking-tight">{post.title}</h4>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {favoritePosts.length > 3 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: Math.ceil(favoritePosts.length / 3) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBlogPageIndex(idx)}
                      className={`h-2 rounded-full transition-all ${blogPageIndex === idx ? "w-8 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/40"
                        }`}
                    />
                  ))}
                </div>
              )}

              <div className="mt-2 pt-2">
                <Link
                  to="/blog"
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all"
                >
                  Découvrir les articles <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* GAMMES CARRE CAROUSEL */}
      {gammes.length > 0 && (
        <motion.section
          {...fadeInUp}
          className="py-8 bg-background border-b border-border"
        >
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
              {gammes.map((g) => (
                <motion.div
                  key={g.id}
                  variants={fadeInUp}
                  whileHover={{ y: -5 }}
                >
                  <Link
                    to={`/boutique?gamme=${encodeURIComponent(g.name)}`}
                    className="flex flex-col items-center gap-3 min-w-[120px] sm:min-w-[150px] snap-center group"
                  >
                    <div className="w-28 h-20 sm:w-36 sm:h-24 rounded-2xl border-2 border-primary/20 p-1 group-hover:border-primary transition-colors overflow-hidden shrink-0">
                      {g.cover_image ? (
                        <img src={getImageUrl(g.cover_image)} alt={g.name} className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground text-center">Sans image</span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-center group-hover:text-primary transition-colors">{g.name}</span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* TRUST BADGES */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
        className="bg-primary text-primary-foreground py-10"
      >
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: Truck, title: "Livraison gratuite", sub: "Partout en Tunisie" },
            { icon: CreditCard, title: "Paiement à la livraison", sub: "Sans frais cachés" },
            { icon: Shield, title: "Garantie 10 ans", sub: "Sur tous nos matelas" },
            { icon: Clock, title: "Service client 24/7", sub: "+216 71 000 000" },
          ].map(({ icon: Icon, title, sub }) => (
            <motion.div
              key={title}
              variants={fadeInUp}
              className="flex flex-col items-center gap-3"
            >
              <div className="p-3 bg-white/10 rounded-2xl">
                <Icon className="w-7 h-7" />
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
        <div className="max-w-3xl mx-auto">
          <motion.div
            layout
            className="grid grid-cols-3 sm:grid-cols-6 gap-3"
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
      <ThreeDShowcase />

      {/* COLLECTIONS */}
      <motion.section
        {...fadeInUp}
        className="max-w-7xl mx-auto px-4 pb-8"
      >
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Explorez</span>
          <h2 className="text-2xl md:text-3xl font-black mt-1 mb-2">Nos Collections</h2>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {categories.length > 0 ? categories.slice(0, 3).map((c) => (
            <motion.button
              key={c.id}
              variants={fadeInUp}
              whileHover={{ y: -5, scale: 1.01 }}
              onClick={() => navigate(`/boutique?categorie=${encodeURIComponent(c.label)}`)}
              className="rounded-2xl p-6 text-center shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]"
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
            <div className="col-span-1 md:col-span-3 text-center py-6 text-muted-foreground">Aucune collection disponible</div>
          )}
        </motion.div>
      </motion.section>

      {/* BEST SELLERS */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="flex items-center justify-between mb-12"
          >
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Populaires</span>
              <h2 className="text-3xl md:text-4xl font-black mt-1">Best Sellers</h2>
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {allProducts.map((p) => (
                <motion.div key={p.id} variants={fadeInUp}>
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* PROMO BANNER */}
      <motion.section
        {...fadeInUp}
        className="max-w-7xl mx-auto px-4 py-16"
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative overflow-hidden rounded-[2rem] bg-secondary text-secondary-foreground p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 shadow-2xl shadow-secondary/20"
        >
          <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none">
            <img src="/images/TopRelax-1.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 flex-1">
            <motion.span
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest"
            >
              OFFRE LIMITÉE
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 leading-tight">Jusqu'à -20% sur les top modèles</h2>
            <p className="text-secondary-foreground/80 mb-8 text-lg max-w-lg">Profitez de nos meilleures offres sur les matelas Top Relax et Tendresse pour des nuits inoubliables.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/boutique")}
              className="bg-primary text-primary-foreground font-black px-10 py-5 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
            >
              Profiter de l'offre <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: 5 }}
            whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
            className="relative z-10 hidden lg:block"
          >
            <img src="/images/TopRelax-1.jpg" alt="Top Relax" className="w-80 h-60 object-cover rounded-3xl shadow-2xl border-4 border-white/20" />
          </motion.div>
        </motion.div>
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
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {reviewsList.map((r, i) => (
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
                <p className="text-base text-foreground/80 mb-6 italic flex-1 leading-relaxed">"{r.message}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-lg font-black shadow-inner">{r.name[0]}</div>
                  <div>
                    <p className="text-base font-black truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{r.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {reviewsList.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground italic">
                Aucun témoignage disponible pour le moment.
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* LATEST BLOG POSTS CARDS */}
      {blogPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-20">
          <motion.div
            {...fadeInUp}
            className="flex items-center justify-between mb-12"
          >
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Le Mag Super Siesta</span>
              <h2 className="text-4xl font-black mt-1">Derniers Conseils & Actus</h2>
            </div>
            <Link to="/blog" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
          >
            {blogPosts.map((post) => (
              <motion.div key={post.id} variants={fadeInUp}>
                <Link to={`/blog/${post.slug}`} className="group block bg-card border border-border rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-2 h-full">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    {post.image_url ? (
                      <img src={getImageUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Star className="w-12 h-12 text-muted-foreground opacity-10" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] font-black text-primary uppercase bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">{post.category}</span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="font-black text-xl mt-1 group-hover:text-primary transition-colors line-clamp-2 leading-tight">{post.title}</h3>
                    <p className="text-muted-foreground text-sm mt-4 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-sm font-black text-primary mt-6 group-hover:gap-3 transition-all">
                      Lire l'article <ArrowRight className="w-5 h-5" />
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
          <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto relative z-10" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="votre-email@exemple.com"
              className="flex-1 bg-white border-2 border-transparent rounded-2xl px-6 py-4 text-lg shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-primary text-primary-foreground font-black px-8 py-4 rounded-2xl hover:bg-primary/90 transition-all text-lg shadow-lg shadow-primary/20"
            >
              S'inscrire
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
        href="https://wa.me/21671000000"
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