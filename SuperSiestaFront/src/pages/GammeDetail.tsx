import { useParams, Link, useNavigate } from "react-router-dom";
import { useGamme } from "@/hooks/useGammes";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import CachedImage from "@/components/CachedImage";
import { Loader2, ArrowLeft, Play } from "lucide-react";
import { useState } from "react";

export default function GammeDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { gamme, isLoading } = useGamme(slug);
  const { data: products } = useProducts();
  const [activeTab, setActiveTab] = useState<"video" | "photos" | "3d">("video");

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!gamme) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg">Gamme introuvable.</p>
        <Link to="/boutique" className="text-primary hover:underline text-sm mt-4 inline-block">
          ← Retour à la boutique
        </Link>
      </main>
    );
  }

  const gammeProducts = (products || []).filter((p) => p.gamme === gamme.name);

  const tabs = [
    { key: "video" as const, label: "Vidéo", show: !!gamme.video_url },
    { key: "photos" as const, label: "Photos", show: gamme.photos.length > 0 },
    { key: "3d" as const, label: "Images 3D", show: gamme.images_3d.length > 0 },
  ].filter((t) => t.show);

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="mb-10">
        <span className="text-xs font-bold text-primary uppercase tracking-widest">Gamme</span>
        <h1 className="text-4xl font-black mt-1 mb-3">{gamme.name}</h1>
        {gamme.description && (
          <p className="text-muted-foreground max-w-2xl">{gamme.description}</p>
        )}
      </div>

      {/* Media Tabs */}
      {tabs.length > 0 && (
        <div className="mb-12">
          <div className="flex gap-2 mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Video */}
          {activeTab === "video" && gamme.video_url && (
            <div className="max-w-md mx-auto">
              <div className="relative rounded-2xl overflow-hidden bg-foreground/5 aspect-[9/16]">
                <video
                  src={gamme.video_url}
                  controls
                  className="w-full h-full object-cover"
                  poster=""
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
                  <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center">
                    <Play className="w-7 h-7 text-primary-foreground ml-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photos */}
          {activeTab === "photos" && gamme.photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gamme.photos.map((url, i) => (
                <div key={i} className="rounded-2xl overflow-hidden aspect-square bg-muted">
                  <CachedImage src={url} alt={`${gamme.name} photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          )}

          {/* 3D */}
          {activeTab === "3d" && gamme.images_3d.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamme.images_3d.map((url, i) => (
                <div key={i} className="rounded-2xl overflow-hidden aspect-[4/3] bg-muted border border-border">
                  <CachedImage src={url} alt={`${gamme.name} 3D ${i + 1}`} className="w-full h-full object-contain p-4" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products */}
      <div className="mb-6">
        <h2 className="text-2xl font-black mb-2">Produits de la gamme {gamme.name}</h2>
        <p className="text-muted-foreground text-sm">{gammeProducts.length} produit{gammeProducts.length > 1 ? "s" : ""}</p>
      </div>

      {gammeProducts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Aucun produit dans cette gamme pour le moment.</p>
          <Link to="/boutique" className="text-primary hover:underline text-sm mt-3 inline-block">Voir tous les produits</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gammeProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
