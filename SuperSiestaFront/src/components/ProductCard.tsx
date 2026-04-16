import { ShoppingCart, Star } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  selectedDimension?: string;
}

export default function ProductCard({ product, selectedDimension }: ProductCardProps) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  
  // Find the right size to display
  let displaySize = null;
  const isSpecificDimension = selectedDimension && selectedDimension !== "Tous";
  
  if (isSpecificDimension) {
    displaySize = product.sizes?.find(s => s.label === selectedDimension);
  }
  
  // If no specific dimension or not found, use minimal price size
  if (!displaySize && product.sizes && product.sizes.length > 0) {
    displaySize = [...product.sizes].sort((a, b) => a.price - b.price)[0];
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
      onClick={() => navigate(`/produit/${product.slug}`)}
    >
      <div className="relative overflow-hidden aspect-[4/3] bg-muted">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {product.badge && <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-md">{product.badge}</span>}
        {product.inPromo && <span className="absolute top-3 right-3 bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-md">Promo</span>}
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1 capitalize">{product.categorie}</p>
        <h3 className="font-bold text-lg mb-1">{product.name}</h3>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" />)}
          <span className="text-xs text-muted-foreground ml-1">(128)</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {displaySize ? (
              <>
                <span className="text-xl font-black text-primary">
                  {!isSpecificDimension && "à partir de "}{formatPrice(displaySize.price)}
                </span>
                {displaySize.originalPrice && <span className="text-sm text-muted-foreground line-through ml-2">{formatPrice(displaySize.originalPrice)}</span>}
              </>
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
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-md capitalize">{product.fermete}</span>
        </div>
      </div>
    </motion.div>
  );
}
