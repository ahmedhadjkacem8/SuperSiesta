import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, FileText, Receipt, Plus, Trash2, Pencil, X, FileOutput, ShoppingCart, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { Product, mapApiProductToProduct } from "@/hooks/useProducts";
import MySwal, { confirmDelete } from "@/lib/swal";
import { formatPrice } from "@/lib/utils";

interface QuoteSubItem {
  dimension: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ProductGroup {
  product_slug: string;
  description: string;
  items: QuoteSubItem[];
}

interface LineItem {
  product_slug?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  dimension?: string;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string | null;
  client_name?: string | null;
  status: string;
  total: number;
  discount_type: "percentage" | "amount";
  discount_value: number;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  client?: { full_name: string } | null;
}

interface Client { id: string; full_name: string; phone: string | null; address: string | null; city: string | null; }

export default function AdminDevis() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  
  const [groups, setGroups] = useState<ProductGroup[]>([{ 
    product_slug: "", 
    description: "", 
    items: [{ dimension: "", quantity: 1, unit_price: 0, total: 0 }]
  }]);
  const [taxRate, setTaxRate] = useState(0);
  const [form, setForm] = useState({ 
    quote_number: "", 
    client_id: "", 
    client_name: "",
    status: "créé", 
    notes: "", 
    valid_until: today,
    discount_type: "amount" as "percentage" | "amount",
    discount_value: 0
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Quote[]>("/quotes");
      setQuotes(data || []);
      const cl = await api.get<Client[]>("/clients");
      setClients(cl || []);
      
      const prodData: any = await api.getProducts();
      const productList = Array.isArray(prodData) ? prodData : prodData?.data || [];
      setDbProducts(productList.map(mapApiProductToProduct));
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const fetchNextNumber = async () => {
    try {
      const resp = await api.get<{ next_number: string }>("/quotes/next-number");
      if (resp && resp.next_number) {
        setForm(prev => ({ ...prev, quote_number: resp.next_number }));
      }
    } catch (err) {
      console.error("Failed to fetch next number", err);
      // Fallback
      const nextNum = quotes.length > 0 
        ? `DEV-${(quotes.length + 1).toString().padStart(4, '0')}`
        : "DEV-0001";
      setForm(prev => ({ ...prev, quote_number: nextNum }));
    }
  };

  const resetForm = () => {
    setForm({ 
      quote_number: "", 
      client_id: "", 
      client_name: "",
      status: "créé", 
      notes: "", 
      valid_until: today,
      discount_type: "amount",
      discount_value: 0
    });
    setGroups([{ product_slug: "", description: "", items: [{ dimension: "", quantity: 1, unit_price: 0, total: 0 }] }]);
    setTaxRate(0);
    setEditing(null);
    fetchNextNumber();
  };


  const updateDimension = (groupIndex: number, itemIndex: number, field: keyof QuoteSubItem, value: any) => {
    setGroups(prev => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const items = [...g.items];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      items[itemIndex].total = items[itemIndex].quantity * items[itemIndex].unit_price;
      g.items = items;
      next[groupIndex] = g;
      return next;
    });
  };

  const addDimension = (groupIndex: number) => {
    setGroups(prev => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      g.items = [...g.items, { dimension: "", quantity: 1, unit_price: 0, total: 0 }];
      next[groupIndex] = g;
      return next;
    });
  };

  const subtotal = groups.reduce((total, group) => {
    return total + group.items.reduce((st, it) => st + it.total, 0);
  }, 0);

  const discountAmount = form.discount_type === "percentage" 
    ? (subtotal * (form.discount_value / 100))
    : form.discount_value;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const selectProduct = (index: number, slug: string) => {
    const product = dbProducts.find((p) => p.slug === slug);
    if (!product) return;
    
    setGroups((prev) => {
      const next = [...prev];
      const g = { 
        ...next[index], 
        product_slug: slug, 
        description: product.name,
        items: [{ 
          dimension: product.sizes[0]?.label || "", 
          quantity: 1, 
          unit_price: product.sizes[0]?.price || 0,
          total: product.sizes[0]?.price || 0
        }]
      };
      next[index] = g;
      return next;
    });
  };

  const selectDimension = (groupIndex: number, itemIndex: number, label: string) => {
    const slug = groups[groupIndex].product_slug;
    const product = dbProducts.find((p) => p.slug === slug);
    if (!product) return;
    
    const size = product.sizes.find(s => s.label === label);
    if (!size) return;
    
    updateDimension(groupIndex, itemIndex, "dimension", label);
    updateDimension(groupIndex, itemIndex, "unit_price", size.price);
  };

  const handleSave = async () => {
    const flattenedItems = groups.flatMap(g => 
      g.items.map(it => ({
        product_slug: g.product_slug,
        description: g.description,
        dimension: it.dimension,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.total
      }))
    ).filter(it => it.product_slug !== "");

    const payload = {
      quote_number: form.quote_number,
      client_id: (form.client_id && form.client_id !== "manual") ? form.client_id : null,
      client_name: (form.client_id === "manual" || !form.client_id) ? form.client_name : null,
      status: form.status,
      total: grandTotal,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      notes: form.notes || null,
      valid_until: form.valid_until || null,
      items: flattenedItems
    };
    if (editing) {
      try {
        await api.put(`/quotes/${editing.id}`, payload);
        toast.success("Devis mis à jour");
        setOpen(false); resetForm(); load();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la mise à jour");
      }
    } else {
      try {
        await api.post("/quotes", payload);
        toast.success("Devis créé");
        setOpen(false); resetForm(); load();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la création");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce devis ?", "Le devis sera définitivement supprimé."))) return;
    try {
      await api.delete(`/quotes/${id}`);
      toast.success("Devis supprimé"); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // Save previous state for rollback
    const previousQuotes = [...quotes];
    
    // Optimistic update
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    
    try {
      const updatedQuote = await api.put<Quote>(`/quotes/${id}`, { status: newStatus });
      toast.success("Statut mis à jour");
      
      // Update with server data
      if (updatedQuote && updatedQuote.id) {
        setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...updatedQuote } : q));
      } else {
        load();
      }
    } catch (err: any) {
      setQuotes(previousQuotes); // Rollback
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  };

  const openEdit = async (q: Quote) => {
    setEditing(q);
    setForm({ 
      quote_number: q.quote_number, 
      client_id: q.client_id || "", 
      client_name: q.client_name || "",
      status: q.status, 
      notes: q.notes || "", 
      valid_until: q.valid_until || today,
      discount_type: q.discount_type || "amount",
      discount_value: q.discount_value || 0
    });
    try {
      const data = await api.get<LineItem[]>(`/quotes/${q.id}/items`);
      if (data && data.length > 0) {
        // Group items by product_slug and description
        const grouped: ProductGroup[] = [];
        data.forEach(item => {
          let g = grouped.find(x => x.product_slug === item.product_slug && x.description === item.description);
          if (!g) {
            g = { product_slug: item.product_slug || "", description: item.description, items: [] };
            grouped.push(g);
          }
          g.items.push({ 
            dimension: item.dimension || "", 
            quantity: item.quantity, 
            unit_price: Number(item.unit_price), 
            total: Number(item.total) 
          });
        });
        setGroups(grouped);
      } else {
        setGroups([{ product_slug: "", description: "", items: [{ dimension: "", quantity: 1, unit_price: 0, total: 0 }] }]);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des articles du devis");
      setGroups([{ product_slug: "", description: "", items: [{ dimension: "", quantity: 1, unit_price: 0, total: 0 }] }]);
    }
    setOpen(true);
  };

  const convertToInvoice = async (q: Quote) => {
    if (!(await confirmDelete("Convertir ce devis en facture ?", "Une nouvelle facture sera générée à partir des articles de ce devis."))) return;
    try {
      await api.post(`/quotes/${q.id}/to-invoice`, {});
      toast.success("Facture générée");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la conversion");
    }
  };

  const convertToOrder = async (q: Quote) => {
    const result = await MySwal.fire({
      title: '<span class="text-emerald-600 font-black">Conversion en Commande</span>',
      html: `Êtes-vous sûr de vouloir transformer le devis <b>#${q.quote_number}</b> en une commande officielle ?<br/><small class="text-muted-foreground">Cette action créera une nouvelle entrée dans la liste des commandes.</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmer la conversion",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
      customClass: {
        popup: 'rounded-3xl border-none shadow-2xl',
        confirmButton: 'rounded-xl px-6 py-2 font-bold uppercase tracking-wider',
        cancelButton: 'rounded-xl px-6 py-2 font-bold uppercase tracking-wider'
      }
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await api.post(`/quotes/${q.id}/to-order`, {});
        // Also update the quote status to "facturé" to prevent multiple conversions
        await api.put(`/quotes/${q.id}`, { status: 'facturé' });
        toast.success("Commande générée avec succès !");
        load();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la conversion");
      } finally {
        setLoading(false);
      }
    }
  };

  const statusColor = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = { créé: "outline", envoyé: "secondary", accepté: "default", refusé: "destructive" /*, facturé: "default" */ };
    return map[s] || "outline";
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Devis</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nouveau devis</Button></DialogTrigger>
            <DialogContent className="max-w-[85vw] w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Modifier le devis" : "Nouveau devis"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">N° Devis</label>
                  <Input readOnly value={form.quote_number} className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Date de validité</label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </div>
                
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Client (Sélectionner ou saisir)</label>
                    <div className="flex gap-2">
                       <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, client_name: "" })}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Client existant..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">-- Client manuel --</SelectItem>
                          {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {(form.client_id === "" || form.client_id === "manual") && (
                        <Input 
                          placeholder="Nom du client..." 
                          value={form.client_name} 
                          onChange={(e) => setForm({ ...form, client_id: "manual", client_name: e.target.value })} 
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>
                  {editing && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Statut</label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["créé", "envoyé", "accepté", "refusé", "facturé"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-bold border-l-4 border-primary pl-3">Articles & Produits</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setGroups(prev => [...prev, { product_slug: "", description: "", items: [{ dimension: "", quantity: 1, unit_price: 0, total: 0 }] }])}>
                    <Plus className="w-3 h-3 mr-1" /> Nouveau Produit
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {groups.map((group, gIdx) => {
                    const selectedProd = dbProducts.find(p => p.slug === group.product_slug);
                    return (
                      <div key={gIdx} className="p-4 border-2 border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                        <div className="flex gap-4 mb-4">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-primary/60 ml-1">Produit à ajouter</label>
                            <Select value={group.product_slug} onValueChange={(v) => selectProduct(gIdx, v)}>
                              <SelectTrigger className="h-10 border-primary/20"><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                              <SelectContent>
                                {dbProducts.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-primary/60 ml-1">Description (Optionnel)</label>
                            <Input 
                              placeholder="Nom personnalisé..." 
                              value={group.description} 
                              onChange={(e) => {
                                const next = [...groups];
                                next[gIdx].description = e.target.value;
                                setGroups(next);
                              }}
                              className="h-10"
                            />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="mt-6 text-destructive hover:bg-destructive/10" 
                            onClick={() => setGroups(prev => prev.filter((_, i) => i !== gIdx))}
                            disabled={groups.length === 1}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>

                        {group.product_slug && (
                          <div className="pl-6 space-y-3">
                            <div className="flex justify-between items-center mr-2">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Dimensions & Détails</p>
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-primary/5 text-primary" onClick={() => addDimension(gIdx)}>
                                <Plus className="w-3 h-3 mr-1" /> Ajouter Dimension
                              </Button>
                            </div>
                            
                            <Table className="border-none">
                              <TableHeader className="bg-muted/40">
                                <TableRow className="h-8 border-b border-border hover:bg-transparent">
                                  <TableHead className="text-[10px] uppercase font-black h-8 text-primary/70">Dimension</TableHead>
                                  <TableHead className="text-[10px] uppercase font-black w-32 h-8 text-center text-primary/70">Quantité</TableHead>
                                  <TableHead className="text-[10px] uppercase font-black w-44 h-8 text-right text-primary/70">Prix Unitaire (DT)</TableHead>
                                  <TableHead className="text-[10px] uppercase font-black w-44 h-8 text-right text-primary/70">Total Ligne</TableHead>
                                  <TableHead className="w-12 h-8"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.items.map((sub, iIdx) => (
                                  <TableRow key={iIdx} className="hover:bg-primary/[0.03] transition-colors border-border/40">
                                    <TableCell className="py-1">
                                      <Select value={sub.dimension} onValueChange={(v) => selectDimension(gIdx, iIdx, v)}>
                                        <SelectTrigger className="h-7 text-xs border-none bg-primary/5 hover:bg-primary/10 transition-all font-semibold w-[160px] rounded-md shadow-none px-2"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {selectedProd?.sizes.map(s => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="py-1">
                                      <div className="flex justify-center">
                                        <Input 
                                          type="number" 
                                          value={sub.quantity} 
                                          onChange={(e) => updateDimension(gIdx, iIdx, "quantity", Number(e.target.value))}
                                          className="h-8 w-24 text-center border-border/50 bg-background hover:border-primary/40 transition-all focus:ring-1 focus:ring-primary/50"
                                          min={1}
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-1">
                                      <div className="flex justify-end">
                                        <Input 
                                          type="number" 
                                          value={sub.unit_price} 
                                          onChange={(e) => updateDimension(gIdx, iIdx, "unit_price", Number(e.target.value))}
                                          className="h-8 w-36 text-right font-bold border-border/50 bg-background hover:border-primary/40 transition-all focus:ring-1 focus:ring-primary/50"
                                          step="0.5"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-1 text-right">
                                      <span className="text-base font-black text-primary drop-shadow-sm">{formatPrice(sub.total)}</span>
                                    </TableCell>
                                    <TableCell className="py-1 text-center">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors" 
                                        onClick={() => {
                                          const next = [...groups];
                                          next[gIdx].items = next[gIdx].items.filter((_, i) => i !== iIdx);
                                          if (next[gIdx].items.length === 0) {
                                            setGroups(prev => prev.filter((_, i) => i !== gIdx));
                                          } else {
                                            setGroups(next);
                                          }
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-primary/5 rounded-2xl p-4 space-y-3 border border-primary/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>
                
                {/* 
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Remise</span>
                    <Select 
                      value={form.discount_type} 
                      onValueChange={(v: "percentage" | "amount") => setForm({ ...form, discount_type: v })}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Montant (DT)</SelectItem>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      value={form.discount_value} 
                      onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} 
                      className="h-8 w-20 text-xs" 
                    />
                  </div>
                  <span className="text-destructive font-bold">-{formatPrice(discountAmount)}</span>
                </div>
                */}

                <div className="flex justify-between items-center border-t border-primary/20 pt-3">
                  <span className="text-lg font-black uppercase tracking-wider">Total à payer</span>
                  <span className="text-2xl font-black text-primary underline decoration-primary/30 underline-offset-4">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Total TTC</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  Aucun devis trouvé
                </TableCell>
              </TableRow>
            )}
            {quotes.map((q) => {
              const flow = ["créé", "envoyé", "accepté", "refusé", "facturé"].map(s => s.normalize('NFC'));
              const normalizedStatus = q.status.normalize('NFC');
              const currentIdx = flow.indexOf(normalizedStatus);
              const nextStatus = currentIdx === -1 ? flow[0] : flow[(currentIdx + 1) % flow.length];

              return (
                <TableRow key={q.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="font-mono text-xs uppercase font-bold text-primary">#{q.quote_number}</TableCell>
                  <TableCell className="font-medium">{q.client?.full_name || q.client_name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <button 
                        onClick={() => q.status !== 'facturé' && updateStatus(q.id, nextStatus)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border cursor-pointer hover:brightness-95 shadow-sm min-w-[110px] justify-center ${
                          normalizedStatus === 'créé' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                          normalizedStatus === 'envoyé' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          normalizedStatus === 'accepté' ? 'bg-green-100 text-green-800 border-green-200' :
                          normalizedStatus === 'refusé' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-primary/10 text-primary border-primary/20'
                        }`}
                        title="Cliquer pour changer de statut"
                      >
                        {q.status}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-primary text-right">{formatPrice(q.total)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(q.created_at).toLocaleDateString("fr-TN")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)} title="Modifier"><Pencil className="w-4 h-4" /></Button>
                      
                      {(q.status === "créé" || q.status === "envoyé" || q.status === "accepté") && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all hover:scale-110" 
                          onClick={() => convertToOrder(q)} 
                          title="Convertir en commande"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* {q.status !== "facturé" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => convertToInvoice(q)} title="Convertir en facture">
                          <FileOutput className="w-4 h-4" />
                        </Button>
                      )} */}
                      
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(q.id)} title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
