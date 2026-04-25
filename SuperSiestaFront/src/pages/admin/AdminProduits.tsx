import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import { api } from "@/lib/apiClient";
import { Plus, Trash2, Pencil, X, DollarSign, Gift } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { confirmDelete } from "@/lib/swal";

interface Product {
  id: string;
  name: string;
  slug: string;
  categorie: string;
  fermete: string;
  image: string;
  images: string[];
  description: string;
  specs: string[];
  badge: string | null;
  in_promo: boolean;
  gamme: string | null;
  grammage: number | null;
  sizes?: ProductSize[];
  created_at: string;
}

interface ProductSize {
  id?: string;
  label: string;
  price: number;
  reseller_price: number | null;
  original_price: number | null;
}


interface FormState {
  name: string;
  slug: string;
  categorie: string;
  fermete: string;
  image_file: File | null;
  image_preview: string;
  description: string;
  badge: string;
  in_promo: boolean;
  specs: string;
  gamme: string;
  grammage: string;
}

export default function AdminProduits() {
  const [products, setProducts] = useState<Product[]>([]);
  const [gammes, setGammes] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<{ id: string; label: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [fermetes, setFermetes] = useState<{ id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletedSizeIds, setDeletedSizeIds] = useState<string[]>([]);

  const [form, setForm] = useState<FormState>({
    name: "", slug: "", categorie: "", fermete: "",
    image_file: null, image_preview: "", description: "", badge: "", in_promo: false, specs: "", gamme: "", grammage: ""
  });
  const [sizes, setSizes] = useState<ProductSize[]>([
    { label: "80×190", price: 0, reseller_price: null, original_price: null }
  ]);

  const load = async () => {
    try {
      const [pData, gData, dData, catData, fermData] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<any[]>(`/gammes?t=${Date.now()}`),
        api.get<any[]>(`/dimensions?t=${Date.now()}`),
        api.get<any[]>("/categories"),
        api.get<any[]>("/fermetes")
      ]);
      setProducts(pData || []);
      setGammes(gData || []);
      setDimensions(dData || []);
      setCategories(catData || []);
      setFermetes(fermData || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", categorie: "", fermete: "", image_file: null, image_preview: "", description: "", badge: "", in_promo: false, specs: "", gamme: "", grammage: "" });
    setSizes([{ label: "80×190", price: 0, reseller_price: null, original_price: null }]);

    setEditing(null);
    setDeletedSizeIds([]);
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Le nom est requis"); return; }
    const slug = form.slug || generateSlug(form.name);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("slug", slug);
    if (!form.categorie) { toast.error("Catégorie requise"); return; }
    formData.append("categorie", form.categorie);
    if (!form.fermete) { toast.error("Fermeté requise"); return; }
    formData.append("fermete", form.fermete);
    formData.append("description", form.description);
    formData.append("badge", form.badge || "");
    formData.append("in_promo", form.in_promo ? "1" : "0");
    formData.append("gamme", form.gamme || "");
    formData.append("grammage", form.grammage || "");
    
    // Append each spec as an array element
    const specs = form.specs.split("\n").filter(Boolean);
    specs.forEach((spec) => {
      formData.append("specs[]", spec);
    });

    if (form.image_file) {
      formData.append("image", form.image_file);
    }

    try {
      let productId = editing?.id;
      if (editing) {
        formData.append("_method", "PUT");
        await api.post(`/products/${editing.id}`, formData);
        toast.success("Produit mis à jour");
      } else {
        const product = await api.post<Product>("/products", formData);
        productId = product.id;
        toast.success("Produit créé");
      }

      // Handle Sizes
      if (productId) {
        // Delete sizes
        await Promise.all(deletedSizeIds.map(sid => api.delete(`/products/${productId}/sizes/${sid}`)));
        
        // Save/Update sizes
        await Promise.all(sizes.map(async (size) => {
          if (!size.label.trim()) return;
          if (size.id) {
            return api.put(`/products/${productId}/sizes/${size.id}`, size);
          } else {
            return api.post(`/products/${productId}/sizes`, size);
          }
        }));
      }

      setOpen(false); resetForm(); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce produit ?", "Cette action est irréversible !"))) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Produit supprimé"); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const openEdit = async (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug, categorie: p.categorie, fermete: p.fermete,
      image_file: null, image_preview: p.image, description: p.description, badge: p.badge || "",
      in_promo: p.in_promo, specs: (p.specs || []).join("\n"), gamme: p.gamme || "", grammage: p.grammage || ""
    });
    const [productData, sizesData] = await Promise.all([
      api.get<Product>(`/products/${p.id}`),
      api.get<any[]>(`/products/${p.id}/sizes`).catch(() => [])
    ]);
    
    if (sizesData && sizesData.length > 0) {
      setSizes(sizesData.map((d: any) => ({
        id: d.id, label: d.label, price: Number(d.price),
        reseller_price: d.reseller_price ? Number(d.reseller_price) : null,
        original_price: d.original_price ? Number(d.original_price) : null,
      })));
    } else {
      setSizes([{ label: "80×190", price: 0, reseller_price: null, original_price: null }]);
    }

    setDeletedSizeIds([]);
    setOpen(true);
  };

  const addSize = () => setSizes((prev) => [...prev, { label: "", price: 0, reseller_price: null, original_price: null }]);
  const removeSize = (i: number) => {
    const size = sizes[i];
    if (size.id) setDeletedSizeIds(prev => [...prev, size.id!]);
    setSizes((prev) => prev.filter((_, idx) => idx !== i));
  };
  const updateSize = (i: number, field: keyof ProductSize, value: any) => {
    setSizes((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produits (CMS)</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nouveau produit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v, slug: generateSlug(v), gamme: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner la gamme (Nom du produit)" /></SelectTrigger>
                  <SelectContent>
                    {gammes.map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                  <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.label} className="capitalize">{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.fermete} onValueChange={(v) => setForm({ ...form, fermete: v })}>
                  <SelectTrigger><SelectValue placeholder="Fermeté" /></SelectTrigger>
                  <SelectContent>
                    {fermetes.map((f) => <SelectItem key={f.id} value={f.label} className="capitalize">{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ImageUpload
                value={form.image_file}
                onChange={(file) => setForm({ ...form, image_file: file })}
                preview={form.image_preview}
                label="Image principale du produit"
                placeholder="Glissez ou cliquez pour uploader l'image"
              />
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <Textarea placeholder="Spécifications (une par ligne)" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} rows={4} />
              <div className="flex gap-4 items-center">
                <Input placeholder="Badge (ex: Best Seller)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="flex-1" />
                <Input type="number" placeholder="Charge supportée (kg)" value={form.grammage} onChange={(e) => setForm({ ...form, grammage: e.target.value })} className="flex-1" />
                <div className="flex items-center gap-2">
                  <Switch checked={form.in_promo} onCheckedChange={(v) => setForm({ ...form, in_promo: v })} />
                  <span className="text-sm">En promo</span>
                </div>
              </div>

              {/* Sizes with dual pricing */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold flex items-center gap-1"><DollarSign className="w-4 h-4" /> Tailles & Prix (BtoC / BtoB)</p>
                  <Button type="button" variant="outline" size="sm" onClick={addSize}><Plus className="w-3 h-3 mr-1" /> Taille</Button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 text-xs font-medium text-muted-foreground">
                    <span>Dimension</span>
                    <span>Prix BtoC</span>
                    <span>Prix BtoB</span>
                    <span>Ancien prix</span>
                    <span></span>
                  </div>
                    {sizes.map((size, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2">
                        <Select value={size.label} onValueChange={(v) => updateSize(i, "label", v)}>
                          <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Taille" /></SelectTrigger>
                          <SelectContent>
                            {dimensions.map((d) => (
                              <SelectItem key={d.id} value={d.label}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={size.price} onChange={(e) => updateSize(i, "price", Number(e.target.value))} className="text-xs h-8" />
                      <Input type="number" value={size.reseller_price ?? ""} onChange={(e) => updateSize(i, "reseller_price", e.target.value ? Number(e.target.value) : null)} className="text-xs h-8" placeholder="—" />
                      <Input type="number" value={size.original_price ?? ""} onChange={(e) => updateSize(i, "original_price", e.target.value ? Number(e.target.value) : null)} className="text-xs h-8" placeholder="—" />
                      {sizes.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSize(i)}><X className="w-3 h-3" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>


              <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Fermeté</TableHead>
              <TableHead>Gamme</TableHead>
              <TableHead>Tailles</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun produit</TableCell></TableRow>
            )}
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded" />
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.categorie}</Badge></TableCell>
                <TableCell className="capitalize text-sm">{p.fermete}</TableCell>
                <TableCell className="text-sm font-medium">{p.gamme || "—"} {p.grammage ? `(${p.grammage})` : ""}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.sizes?.length || 0} tailles {p.sizes && p.sizes.length > 0 && `(${p.sizes[0].label})`}
                </TableCell>
                <TableCell>
                  {p.badge && <Badge>{p.badge}</Badge>}
                  {p.in_promo && <Badge variant="destructive" className="ml-1">Promo</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
