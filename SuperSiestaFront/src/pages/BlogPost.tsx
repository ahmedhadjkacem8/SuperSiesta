import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, ChevronLeft, Calendar, Tag, Share2, Facebook, Twitter } from "lucide-react";
import { api } from "@/lib/apiClient";
import { getImageUrl } from "@/utils/imageUtils";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      try {
        const data = await api.getBlogPost(slug) as Post;
        setPost(data);
      } catch (err) {
        console.error("Erreur lors du chargement de l'article:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = post ? `${post.title} - Super Siesta` : "";

  const shareLinks = [
    { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, icon: "📘" },
    { name: "Twitter", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, icon: "🐦" },
    { name: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`, icon: "💬" },
    { name: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, icon: "💼" },
  ];

  if (loading) return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></main>;

  if (!post) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Article non trouvé.</p>
          <button onClick={() => navigate("/blog")} className="text-primary hover:underline">← Retour au blog</button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <button onClick={() => navigate("/blog")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au blog
      </button>

      <article>
        {post.image_url && (
          <div className="aspect-square rounded-3xl overflow-hidden mb-8 bg-muted">
            <img src={getImageUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${post.category === "conseil" ? "bg-accent text-accent-foreground" : "bg-secondary/10 text-secondary"}`}>
            {post.category === "conseil" ? "Conseil" : "Actualité"}
          </span>
          {post.published_at && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-black mb-6">{post.title}</h1>

        {/* Content - simple markdown-like rendering */}
        <div className="prose prose-lg max-w-none text-foreground">
          {(post.content || "").split("\n").map((line, i) => {
            if (line.startsWith("### ")) return <h3 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(4)}</h3>;
            if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-black mt-8 mb-4">{line.slice(3)}</h2>;
            if (line.startsWith("- ")) return <li key={i} className="text-muted-foreground ml-4 mb-1">{line.slice(2)}</li>;
            if (line.trim() === "") return <br key={i} />;
            return <p key={i} className="text-muted-foreground leading-relaxed mb-3">{line}</p>;
          })}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {post.tags.map((t) => (
              <span key={t} className="text-xs bg-muted px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
        )}

        {/* Share */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm font-bold mb-3 flex items-center gap-2"><Share2 className="w-4 h-4" /> Partager cet article</p>
          <div className="flex gap-2">
            {shareLinks.map((s) => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-accent px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                <span>{s.icon}</span> {s.name}
              </a>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
