import React, { createContext, useContext, useState } from "react";
import { Product, ProductSize } from "@/hooks/useProducts";

export interface CartItem {
  product: Product;
  size: ProductSize;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: ProductSize, qty?: number) => void;
  removeItem: (productId: string, sizeLabel: string) => void;
  updateQty: (productId: string, sizeLabel: string, qty: number) => void;
  total: number;
  count: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Product, size: ProductSize, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.size.label === size.label);
      if (existing) {
        return prev.map((i) => i.product.id === product.id && i.size.label === size.label ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product, size, quantity: qty }];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: string, sizeLabel: string) => {
    setItems((prev) => prev.filter((i) => !(i.product.id === productId && i.size.label === sizeLabel)));
  };

  const updateQty = (productId: string, sizeLabel: string, qty: number) => {
    if (qty <= 0) return removeItem(productId, sizeLabel);
    setItems((prev) => prev.map((i) => i.product.id === productId && i.size.label === sizeLabel ? { ...i, quantity: qty } : i));
  };

  const total = items.reduce((sum, i) => sum + i.size.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), addItem, removeItem, updateQty, total, count, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
