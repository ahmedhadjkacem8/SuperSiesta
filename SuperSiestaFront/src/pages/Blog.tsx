import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Calendar, Tag, ArrowRight } from "lucide-react";
import { api } from "@/lib/apiClient";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { getImageUrl } from "@/utils/imageUtils";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blog" | "conseil">("all");
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await api.getBlogPosts() as BlogPost[];
        setPosts(data || []);
      } catch (err) {
        console.error("Erreur lors du chargement des articles:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

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
      {posts.filter(p => (p as any).is_favorite).length > 0 && (
        <section className="bg-muted/30 py-10 border-b border-border">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-black mb-6 text-center">À la une</h2>
            <div className="relative">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {posts.filter(p => (p as any).is_favorite).map(post => (
                    <div key={post.id} className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.33%] min-w-0 pl-4">
                      <Link to={`/blog/${post.slug}`} className="group block h-full bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                        <div className="aspect-video bg-muted overflow-hidden relative">
                          {post.image_url ? (
                            <img src={getImageUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent text-3xl">⭐</div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500 text-white">★ Favori</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
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

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Aucun article pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  {post.image_url ? (
                    <img src={getImageUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent">
                      <span className="text-4xl">{post.category === "conseil" ? "💡" : "📰"}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${post.category === "conseil" ? "bg-accent text-accent-foreground" : "bg-secondary/10 text-secondary"}`}>
                      {post.category === "conseil" ? "Conseil" : "Actualité"}
                    </span>
                    {post.published_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.published_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                  {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {(post.tags || []).slice(0, 2).map((t) => (
                        <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tag className="w-3 h-3" />{t}
                        </span>
                      ))}
                    </div>
                    <span className="text-primary text-sm font-bold flex items-center gap-1">Lire <ArrowRight className="w-3 h-3" /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
