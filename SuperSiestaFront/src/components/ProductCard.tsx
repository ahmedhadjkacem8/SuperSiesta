import { ShoppingCart, Star } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";
import { getImageUrl } from "@/utils/imageUtils";

interface ProductCardProps {
  product: Product;
  selectedDimension?: string;
  selectedCategorie?: string;
  selectedGamme?: string;
  selectedFermete?: string;
}

export default function ProductCard({ product, selectedDimension, selectedCategorie, selectedGamme, selectedFermete }: ProductCardProps) {
  const { addItem } = useCart();
  const navigate = useNavigate();

  // Find the right size to display
  let displaySize: any = null;
  const isSpecificDimension = selectedDimension && selectedDimension !== "Tous";

  if (isSpecificDimension) {
    displaySize = product.sizes?.find(s => s.label === selectedDimension);
  }

  // If no specific dimension or not found, prefer the first non-zero price size,
  // otherwise fall back to the minimal price size
  if (!displaySize && product.sizes && product.sizes.length > 0) {
    const nonZero = [...product.sizes].filter(s => s.price > 0).sort((a, b) => a.price - b.price)[0];
    displaySize = nonZero || [...product.sizes].sort((a, b) => a.price - b.price)[0];
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displaySize) {
      addItem(product as any, displaySize);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group bg-card rounded-[2rem] overflow-hidden border border-border shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer h-full flex flex-col"
      onClick={() => {
        let url = `/produit/${product.slug}`;
        if (selectedDimension && selectedDimension !== "Tous") {
          url += `?dimension=${encodeURIComponent(selectedDimension)}`;
        }
        navigate(url);
      }}
    >
      <div className="relative overflow-hidden aspect-[4/3] bg-muted">
        <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {product.badge && <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-md">{product.badge}</span>}
        {product.inPromo && <span className="absolute top-3 right-3 bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-md">Promo</span>}
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1 capitalize">{product.categorie}</p>
        <h3 className="font-bold text-lg mb-1">{product.name}</h3>
        {/* <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" />)}
          <span className="text-xs text-muted-foreground ml-1">(128)</span>
        </div> */}
        <div className="flex items-center justify-between">
          <div>
            {displaySize ? (
              <div className="flex flex-col">
                <div className="flex items-baseline">
                  {!(isSpecificDimension && displaySize.price === 0) ? (
                    <span className="text-xl font-black text-primary">
                      {!isSpecificDimension && "à partir de "}{formatPrice(displaySize.price)}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground italic">&nbsp;</span>
                  )}
                  {Number(displaySize.originalPrice) > 0 && displaySize.price !== 0 && <span className="text-sm text-muted-foreground line-through ml-2">{formatPrice(displaySize.originalPrice)}</span>}
                </div>
                {isSpecificDimension && displaySize.price !== 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Pour la dimension</span>
                    <span className="bg-primary/10 text-primary text-s font-black px-2 py-0.5 rounded-md border border-primary/20">
                      {selectedDimension}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground italic">Prix sur demande</span>
            )}
          </div>
          {displaySize && (
            <button onClick={handleQuickAdd} className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors" title="Ajouter au panier">
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
        {(selectedCategorie !== "Tous" && selectedCategorie) || (selectedGamme !== "Tous" && selectedGamme) || (selectedFermete !== "Tous" && selectedFermete) ? (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
            {selectedCategorie && selectedCategorie !== "Tous" && product.categorie && (
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-1 rounded-md tracking-wider">
                {product.categorie}
              </span>
            )}
            {selectedGamme && selectedGamme !== "Tous" && product.gamme && (
              <span className="text-[10px] bg-secondary text-secondary-foreground border border-secondary-foreground/10 font-bold px-2 py-1 rounded-md tracking-wider">
                {product.gamme}
              </span>
            )}
            {selectedFermete && selectedFermete !== "Tous" && product.fermete && (
              <span className="text-[10px] bg-accent text-accent-foreground border border-accent-foreground/10 font-bold px-2 py-1 rounded-md tracking-wider">
                {product.fermete}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
            {product.fermete && (
              <span className="text-[10px] bg-accent text-accent-foreground font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                {product.fermete}
              </span>
            )}
            {product.gamme && (
              <span className="text-[10px] bg-primary/90 text-secondary-foreground font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                {product.gamme}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
