import { useState, useEffect } from "react";

// Allow model-viewer element in this TSX file
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}
import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useGammes } from "@/hooks/useGammes";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuthSecure";
import { Star, Shield, Truck, CreditCard, ChevronLeft, Plus, Minus, Check, Loader2, Play, Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getImageUrl } from "@/utils/imageUtils";
import { api } from '@/lib/apiClient'

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

  // Reviews state (moved up so hooks order is stable)
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewMessage, setReviewMessage] = useState("")
  const [reviewRating, setReviewRating] = useState<number>(5)
  const [dimensions, setDimensions] = useState<any[]>([])

  // Set default size when product loads
  useEffect(() => {
    if (product && product.sizes.length > 0 && !selectedSize) {
      setSelectedSize(product.sizes[0]);
    }
  }, [product, selectedSize]);

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

  // Fetch dimensions for gifts
  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const res = await api.get('/dimensions')
        if (res) setDimensions(Array.isArray(res) ? res : (res as any).data || [])
      } catch (err) {
        console.error('Error fetching dimensions', err)
      }
    }
    fetchDimensions()
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
          <p className="text-muted-foreground mb-4">Produit non trouvé.</p>
          <button onClick={() => navigate("/boutique")} className="text-primary hover:underline">← Retour à la boutique</button>
        </div>
      </div>
    );
  }

  // Check if user is B2B
  const isB2B = false; // Will be set from profile context
  const displayPrice = isB2B && selectedSize.resellerPrice ? selectedSize.resellerPrice : selectedSize.price;
 

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      await api.post('/reviews', {
        product_id: product?.id,
        rating: reviewRating,
        message: reviewMessage,
      })
      setReviewMessage('')
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
    }
  }

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
            {product.grammage && (
              <p className="text-lg font-black text-orange-600 mt-2 flex items-center gap-2">
                Supporte jusqu'à {product.grammage} kg
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {(() => {
                  const avg = averageRating ?? (reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : 0)
                  const rounded = Math.round((avg || 0) * 2) / 2
                  return [1,2,3,4,5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${i <= Math.ceil(rounded) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))
                })()}
              </div>
              {user ? (
                <span className="text-sm text-muted-foreground">({reviews.length} avis)</span>
              ) : (
                <span className="text-sm text-muted-foreground">Avis</span>
              )}
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
                    <h3 className="text-sm font-bold">Cadeaux & Garanties ! 🎁</h3>
                    <p className="text-xs text-muted-foreground">Offres incluses avec cette dimension ({selectedSize.label})</p>
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
                        <p className="text-sm font-bold">Garantie {gamme.warranty} ans</p>
                        <p className="text-[10px] text-muted-foreground">Sérénité totale garantie par Super Siesta</p>
                      </div>
                    </div>
                  )}

                  {/* Dimension Gifts */}
                  {sizeGifts.map((gift: any) => (
                    <div key={gift.id} className="flex items-center gap-3 bg-accent/30 p-3 rounded-2xl border border-primary/10 animate-in slide-in-from-bottom-2 duration-500">
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
            );
          })()}

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold mb-3">Caractéristiques</h3>
            <ul className="space-y-2">
              {product.specs.map((spec) => (
                <li key={spec} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary flex-shrink-0" />{spec}</li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Avis des clients</h3>
              {user ? (
                <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-xs text-primary font-black uppercase tracking-wider">{showReviewForm ? 'Annuler' : 'Donner un avis'}</button>
              ) : (
                <span className="text-xs text-muted-foreground">Connectez-vous pour laisser un avis</span>
              )}
            </div>

            {showReviewForm && user && (
              <form onSubmit={handleSubmitReview} className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Note :</label>
                  <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="px-3 py-2 rounded-lg border">
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} étoiles</option>)}
                  </select>
                </div>
                <textarea value={reviewMessage} onChange={(e) => setReviewMessage(e.target.value)} required placeholder="Votre avis..." className="w-full p-3 border rounded-lg" />
                <div>
                  <button type="submit" className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-lg">Envoyer</button>
                </div>
              </form>
            )}

            {loadingReviews ? (
              <p className="text-sm text-muted-foreground">Chargement des avis...</p>
            ) : (
              <div className="space-y-4">
                {reviews && reviews.length > 0 ? reviews.map((r, i) => (
                  <div key={i} className="p-4 bg-card rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center font-bold">{r.name?.[0] || 'U'}</div>
                        <div>
                          <div className="font-bold">{r.name || 'Utilisateur'}</div>
                          <div className="text-xs text-muted-foreground">{r.city || ''}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold">{r.rating}/5</div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.message}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3D model + Video showcase for the product's gamme */}
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
              <h2 className="text-2xl font-black">Multimédia — Gamme {gamme.name}</h2>
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
                    <button slot="ar-button" className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-2xl font-black text-xs">Voir en AR</button>
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
    </main>
  );
}
