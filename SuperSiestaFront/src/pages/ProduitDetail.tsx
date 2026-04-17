import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useGammes } from "@/hooks/useGammes";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { Star, Shield, Truck, CreditCard, ChevronLeft, Plus, Minus, Check, Loader2, Play, Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getImageUrl } from "@/utils/imageUtils";

export default function ProduitDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const { product, isLoading } = useProduct(slug);
  const { data: gammes } = useGammes();
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  // Set default size when product loads
  useEffect(() => {
    if (product && product.sizes.length > 0 && !selectedSize) {
      setSelectedSize(product.sizes[0]);
    }
  }, [product, selectedSize]);

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
          <p className="text-muted-foreground mb-4">Produit non trouvé.</p>
          <button onClick={() => navigate("/boutique")} className="text-primary hover:underline">← Retour à la boutique</button>
        </div>
      </div>
    );
  }

  // Check if user is B2B
  const isB2B = false; // Will be set from profile context
  const displayPrice = isB2B && selectedSize.resellerPrice ? selectedSize.resellerPrice : selectedSize.price;

  const handleAddToCart = () => {
    addItem(product as any, selectedSize, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <button onClick={() => navigate("/boutique")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour à la boutique
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-3">
          <div className="aspect-square bg-muted rounded-3xl overflow-hidden">
            <img src={getImageUrl(product.images[activeImg] || product.image)} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${activeImg === i ? "border-primary" : "border-border"}`}>
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">{product.categorie}</span>
            {product.badge && <span className="ml-2 bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">{product.badge}</span>}
            <h1 className="text-3xl md:text-4xl font-black mt-2">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />)}
              </div>
              <span className="text-sm text-muted-foreground">(128 avis)</span>
            </div>
          </div>

          <div className="bg-accent rounded-2xl p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-primary">{formatPrice(displayPrice)}</span>
              {selectedSize.originalPrice && <span className="text-lg text-muted-foreground line-through">{formatPrice(selectedSize.originalPrice)}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Prix pour la taille {selectedSize.label}</p>
            {isB2B && selectedSize.resellerPrice && <p className="text-xs text-primary font-bold mt-1">💼 Prix revendeur appliqué</p>}
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div>
            <h3 className="text-sm font-bold mb-3">Choisir la taille</h3>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button key={size.label} onClick={() => setSelectedSize(size)} className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${selectedSize.label === size.label ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                  {size.label}
                  <span className="block text-xs opacity-75">{formatPrice(size.price)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-3">Quantité</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary transition-colors"><Minus className="w-4 h-4" /></button>
              <span className="text-lg font-bold w-8 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleAddToCart} className={`flex-1 font-bold py-4 rounded-2xl transition-all text-sm ${added ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {added ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Ajouté !</span> : "Ajouter au panier"}
            </button>
            <button onClick={() => { addItem(product as any, selectedSize, qty); navigate("/commander"); }} className="flex-1 bg-secondary text-secondary-foreground font-bold py-4 rounded-2xl hover:bg-secondary/90 transition-colors text-sm">Commander →</button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[{ icon: Truck, text: "Livraison gratuite" }, { icon: CreditCard, text: "Paiement à la livraison" }, { icon: Shield, text: "Garantie 10 ans" }].map(({ icon: Icon, text }) => (
              <div key={text} className="bg-muted rounded-xl p-3 text-center">
                <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xs font-medium">{text}</p>
              </div>
            ))}
          </div>

          {product.freeGifts && product.freeGifts.length > 0 && (
            <div className="border-t border-border pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Cadeau offert ! 🎁</h3>
                  <p className="text-xs text-muted-foreground">Inclus gratuitement avec cet article</p>
                </div>
              </div>
              <div className="space-y-3">
                {product.freeGifts.map((gift: any) => (
                  <div key={gift.id} className="flex items-center gap-3 bg-accent/30 p-3 rounded-2xl border border-primary/10">
                    {gift.image ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                        <img src={getImageUrl(gift.image)} alt={gift.titre} className="w-full h-full object-cover" />
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
          )}

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold mb-3">Caractéristiques</h3>
            <ul className="space-y-2">
              {product.specs.map((spec) => (
                <li key={spec} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" />{spec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Video Reel de la gamme */}
      {(() => {
        const gamme = gammes?.find((g) => g.name === product.gamme);
        if (!gamme?.video_url) return null;
        return (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Play className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-black">Découvrez la gamme {gamme.name}</h2>
            </div>
            <div className="max-w-md mx-auto">
              <div className="relative rounded-3xl overflow-hidden bg-muted" style={{ aspectRatio: "9/16" }}>
                <video
                  src={getImageUrl(gamme.video_url)}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                  poster={getImageUrl(gamme.photos?.[0]) || undefined}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Vidéo Reel — Gamme {gamme.name}
              </p>
            </div>
          </section>
        );
      })()}
    </main>
  );
}
