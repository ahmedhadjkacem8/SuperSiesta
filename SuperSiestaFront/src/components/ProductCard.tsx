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
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group bg-card rounded-2xl sm:rounded-[2rem] overflow-hidden border border-border shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer h-full flex flex-col relative"
      onClick={() => {
        let url = `/produit/${product.slug}`;
        if (selectedDimension && selectedDimension !== "Tous") {
          url += `?dimension=${encodeURIComponent(selectedDimension)}`;
        }
        navigate(url);
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-square sm:aspect-[4/3] bg-muted">
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        {/* Léger voile en bas de l'image pour lisibilité des badges */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent pointer-events-none sm:hidden" />

        {product.badge && (
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md shadow-md">
            {product.badge}
          </span>
        )}
        {product.inPromo && (
          <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-secondary text-secondary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md shadow-md">
            Promo
          </span>
        )}

        {/* Bouton ajout rapide flottant sur l'image (mobile-friendly) */}
        {displaySize && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-2 right-2 sm:hidden p-2 bg-primary text-primary-foreground rounded-full shadow-lg active:scale-90 transition-transform"
            title="Ajouter au panier"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 capitalize tracking-wide">
          {product.categorie}
        </p>
        <h3 className="font-bold text-sm sm:text-lg leading-snug mb-1 line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            {displaySize ? (
              <div className="flex flex-col">
                <div className="flex items-baseline flex-wrap gap-x-1.5">
                  {!(isSpecificDimension && displaySize.price === 0) ? (
                    <span className="text-base sm:text-xl font-black text-primary whitespace-nowrap">
                      {!isSpecificDimension && (
                        <span className="text-xs sm:inline">à partir de </span>
                      )}
                      {formatPrice(displaySize.price)}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground italic">&nbsp;</span>
                  )}
                  {Number(displaySize.originalPrice) > 0 && displaySize.price !== 0 && (
                    <span className="text-xs sm:text-sm text-foreground line-through">
                      {formatPrice(displaySize.originalPrice)}
                    </span>
                  )}
                </div>
                {isSpecificDimension && displaySize.price !== 0 && (
                  <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="sm:inline text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Pour la dimension
                    </span>
                    <span className="bg-primary/10 text-primary text-[10px] sm:text-s font-black px-2 py-0.5 rounded-md border border-primary/20">
                      {selectedDimension}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs sm:text-sm font-medium text-muted-foreground italic">Prix sur demande</span>
            )}
          </div>

          {/* Bouton ajout rapide desktop */}
          {displaySize && (
            <button
              onClick={handleQuickAdd}
              className="hidden sm:inline-flex p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex-shrink-0"
              title="Ajouter au panier"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tags */}
        {(selectedCategorie !== "Tous" && selectedCategorie) || (selectedGamme !== "Tous" && selectedGamme) || (selectedFermete !== "Tous" && selectedFermete) ? (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border flex flex-wrap gap-1 sm:gap-1.5">
            {selectedCategorie && selectedCategorie !== "Tous" && product.categorie && (
              <span className="text-[9px] sm:text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-wider">
                {product.categorie}
              </span>
            )}
            {selectedGamme && selectedGamme !== "Tous" && product.gamme && (
              <span className="text-[9px] sm:text-[10px] bg-secondary text-secondary-foreground border border-secondary-foreground/10 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-wider">
                {product.gamme}
              </span>
            )}
            {selectedFermete && selectedFermete !== "Tous" && product.fermete && (
              <span className="text-[9px] sm:text-[10px] bg-accent text-accent-foreground border border-accent-foreground/10 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-wider">
                {product.fermete}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border flex flex-wrap gap-1 sm:gap-1.5">
            {product.fermete && (
              <span className="text-[9px] sm:text-[10px] bg-accent text-accent-foreground font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider">
                {product.fermete}
              </span>
            )}
            {product.gamme && (
              <span className="text-[9px] sm:text-[10px] bg-primary/90 text-secondary-foreground font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider">
                {product.gamme}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}