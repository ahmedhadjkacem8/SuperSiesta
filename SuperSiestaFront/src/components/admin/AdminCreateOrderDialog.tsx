import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, ShoppingCart, User, Package, CheckCircle, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { useOptimizedProducts } from "@/hooks/useOptimizedProducts";
import { formatPrice } from "@/lib/utils";
import type { Product, ProductSize } from "@/hooks/useProducts";

interface AdminCreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SelectedItem {
  product_id: string;
  product_name: string;
  size_label: string;
  unit_price: number;
  quantity: number;
  grammage?: string;
  total: number;
}

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}

export function AdminCreateOrderDialog({ open, onOpenChange, onSuccess }: AdminCreateOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
    client_id: "" as string | undefined,
  });

  const [items, setItems] = useState<SelectedItem[]>([]);
  
  // Products logic
  const [productSearch, setProductSearch] = useState("");
  const { products } = useOptimizedProducts({ per_page: 5 });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Clients logic
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    try {
      const data = await api.get<Client[]>("/clients");
      setClients(data || []);
    } catch (err) {
      console.error("Error loading clients:", err);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSelectedSize(product.sizes.length > 0 ? product.sizes[0] : null);
    setProductSearch("");
  };

  const handleClientSelect = (client: Client) => {
    setFormData({
      ...formData,
      full_name: client.full_name,
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      client_id: client.id,
    });
    setClientSearch("");
    setShowClientResults(false);
    toast.info(`Client ${client.full_name} sélectionné`);
  };

  const addItem = () => {
    if (!selectedProduct || !selectedSize) return;

    const newItem: SelectedItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      size_label: selectedSize.label,
      unit_price: selectedSize.price,
      quantity: quantity,
      total: selectedSize.price * quantity,
    };

    setItems([...items, newItem]);
    setSelectedProduct(null);
    setSelectedSize(null);
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un produit");
      return;
    }

    try {
      setLoading(true);
      await api.post("/orders", {
        ...formData,
        items: items,
        create_account: false,
      });
      toast.success("Commande créée avec succès");
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({ full_name: "", phone: "", address: "", city: "", notes: "", client_id: undefined });
      setItems([]);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création de la commande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <ShoppingCart className="w-5 h-5 text-primary" />
            CRÉATION DE COMMANDE
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Informations Client
                  </h3>
                  {formData.client_id && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="xs" 
                      className="h-7 text-[10px] font-bold uppercase gap-1 text-amber-600 border-amber-200 bg-amber-50"
                      onClick={() => setFormData({...formData, client_id: undefined, full_name: "", phone: "", address: "", city: ""})}
                    >
                      <UserPlus className="w-3 h-3" /> Nouveau Client
                    </Button>
                  )}
                </div>

                {/* Client Search */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un client existant..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientResults(true);
                      }}
                      onFocus={() => setShowClientResults(true)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  {showClientResults && clientSearch.length > 1 && (
                    <div className="absolute z-20 w-full mt-1 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                      {clients
                        .filter(c => 
                          c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                          (c.phone && c.phone.includes(clientSearch))
                        )
                        .map(c => (
                          <div
                            key={c.id}
                            className="p-3 hover:bg-accent cursor-pointer text-sm border-b last:border-0 transition-colors"
                            onClick={() => handleClientSelect(c)}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3 text-primary/60" />
                              <p className="font-bold">{c.full_name}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium uppercase">
                              <span>{c.phone || "Sans tél"}</span>
                              {c.city && <span>• {c.city}</span>}
                            </div>
                          </div>
                        ))}
                      {clients.filter(c => c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone && c.phone.includes(clientSearch))).length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">Aucun client trouvé</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name" className="text-xs font-bold uppercase text-muted-foreground">Nom complet</Label>
                    <Input
                      id="full_name"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Ahmed Ben Salah"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase text-muted-foreground">Téléphone</Label>
                    <Input
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="22 123 456"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-bold uppercase text-muted-foreground">Ville</Label>
                    <Input
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Tunis"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-bold uppercase text-muted-foreground">Adresse</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rue 123, App 4"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-bold uppercase text-muted-foreground">Notes de commande</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Instructions particulières..."
                    className="h-16 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Sélection de Produits
                </h3>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un produit..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                    {productSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                        {products
                          .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .map(p => (
                            <div
                              key={p.id}
                              className="p-3 hover:bg-accent cursor-pointer text-sm border-b last:border-0 transition-colors"
                              onClick={() => handleProductSelect(p)}
                            >
                              <p className="font-bold">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">{p.categorie}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {selectedProduct && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <p className="font-black text-sm text-primary uppercase">{selectedProduct.name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">{selectedProduct.categorie}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Taille / Dimension</Label>
                          <select
                            className="w-full h-9 bg-background border border-input rounded-md text-xs px-2 font-bold"
                            value={selectedSize?.id || ""}
                            onChange={(e) => {
                              const size = selectedProduct.sizes.find(s => s.id === e.target.value);
                              if (size) setSelectedSize(size);
                            }}
                          >
                            {selectedProduct.sizes.map(s => (
                              <option key={s.id} value={s.id}>{s.label} ({formatPrice(s.price)})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantité</Label>
                          <Input
                            type="number"
                            min={1}
                            className="h-9 text-sm font-bold"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <Button type="button" size="sm" className="w-full h-9 font-bold gap-2 shadow-sm" onClick={addItem}>
                        <Plus className="w-4 h-4" /> AJOUTER AU PANIER
                      </Button>
                    </div>
                  )}
                </div>

                {/* Cart Preview */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                    CONTENU DU PANIER <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-primary/10 text-primary">{items.length}</Badge>
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {items.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground bg-background rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <ShoppingCart className="w-6 h-6 opacity-20" />
                        <span>Votre panier est vide</span>
                      </div>
                    )}
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border shadow-sm group hover:border-primary/30 transition-all">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-black text-xs text-foreground uppercase truncate">{item.product_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1 font-bold text-muted-foreground uppercase">{item.size_label}</Badge>
                            <span className="text-[10px] font-black text-primary">x{item.quantity}</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className="font-black text-sm text-primary">{formatPrice(item.total)}</p>
                          <button 
                            type="button" 
                            onClick={() => removeItem(index)}
                            className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {items.length > 0 && (
                    <div className="pt-3 border-t border-border mt-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Total de la commande</span>
                        <span className="text-xl font-black text-primary underline decoration-2 underline-offset-4">{formatPrice(subtotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 pt-2 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="font-bold uppercase text-xs">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || items.length === 0} className="gap-2 px-8 font-black uppercase text-xs shadow-lg shadow-primary/20">
              {loading ? (
                <>Enregistrement...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  CONFIRMER LA COMMANDE
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
