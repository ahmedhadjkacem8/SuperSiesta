import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/utils";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Mon Panier</h2>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <button onClick={closeCart} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Votre panier est vide</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.size.label}`}
                className="flex gap-3 bg-muted/50 rounded-2xl p-3"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">Taille {item.size.label}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQty(item.product.id, item.size.label, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQty(item.product.id, item.size.label, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.product.id, item.size.label)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="font-bold text-sm text-primary">
                    {formatPrice(item.size.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-black text-primary">{formatPrice(total)}</span>
            </div>
            <div className="bg-accent text-accent-foreground text-xs text-center py-2 rounded-xl">
              ✅ Paiement à la livraison — Livraison gratuite
            </div>
            <button
              onClick={() => {
                closeCart();
                navigate("/commander");
              }}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl hover:bg-primary/90 transition-colors text-sm"
            >
              Commander Maintenant →
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
