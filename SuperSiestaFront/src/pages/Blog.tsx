import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Calendar, Tag, ArrowRight, ChevronRight, ChevronLeft, Star } from "lucide-react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { getImageUrl } from "@/utils/imageUtils";
import { useBlogPosts } from "@/hooks/useBlog";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: { staggerChildren: 0.08 },
  },
};

export default function Blog() {
  const [filter, setFilter] = useState<"all" | "blog" | "conseil">("all");
  const { data: posts = [], isLoading } = useBlogPosts();

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  const filtered = filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <main>
      <section className="bg-accent py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Blog & Conseils</span>
          <h1 className="text-4xl font-black mt-2 mb-4">Nos Articles</h1>
          <p className="text-muted-foreground">Conseils sommeil, actualités et nouveautés Super Siesta</p>
        </div>
      </section>

      {/* Slider des articles à la une */}
      {posts.filter(p => p.is_favorite).length > 0 && (
        <section className="bg-muted/30 py-10 border-b border-border">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-black mb-6 text-center">À la une</h2>
            <div className="relative">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {posts.filter(p => p.is_favorite).map(post => (
                    <div key={post.id} className="flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_50%] lg:flex-[0_0_33.33%] min-w-0 pl-4">
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

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="rounded-full bg-yellow-500 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase text-white shadow">
                              ★ Favori
                            </span>
                          </div>
                        </div>

                        {/* CONTENU */}
                        <div className="flex flex-col flex-1 p-4 md:p-8">
                          <h3 className="font-black text-sm md:text-xl leading-snug md:leading-tight break-words group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mt-3 text-[11px] md:text-sm leading-relaxed text-muted-foreground line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}

                          {/* Bouton */}
                          <div className="mt-auto pt-5">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 md:px-5 md:py-2.5 text-[11px] md:text-sm font-bold text-primary transition-all group-hover:bg-primary group-hover:text-white">
                              <span>Lire l'article</span>
                              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={scrollPrev} 
                className="absolute top-1/2 -left-4 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur border border-border shadow-md rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={scrollNext} 
                className="absolute top-1/2 -right-4 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur border border-border shadow-md rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-12">
        {/* Filter */}
        <div className="flex gap-2 mb-8 justify-center">
          {[
            { value: "all" as const, label: "Tous" },
            { value: "conseil" as const, label: "Conseils" },
            { value: "blog" as const, label: "Actualités" },
          ].map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Aucun article pour le moment.</p>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8"
          >
            {filtered.map((post) => (
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
                        {post.category === "conseil" ? "Conseil" : "Actualité"}
                      </span>
                    </div>
                  </div>

                  {/* CONTENU */}
                  <div className="flex flex-col flex-1 p-4 md:p-8">
                    <h3 className="font-black text-sm md:text-xl leading-snug md:leading-tight break-words group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-3 text-[11px] md:text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    {post.published_at && (
                      <span className="mt-3 text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.published_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] md:text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />{t}
                          </span>
                        ))}
                      </div>
                    )}

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
        )}
      </section>
    </main>
  );
}
