import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageUpload from "@/components/ImageUpload";
import { Plus, Trash2, Pencil, Ruler, Layers, Feather, Gift, Hash, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { useSocialNetworks, SocialNetwork, Icon } from "@/hooks/useSocialNetworks";
import LucideIcon from "@/components/common/LucideIcon";
import { Share2, Store } from "lucide-react";

interface Dimension {
  id: string;
  label: string;
  is_standard: boolean;
  free_gifts?: FreeGift[];
}

interface Categorie {
  id: string;
  label: string;
  image: string | null;
  description: string | null;
  color: string | null;
  text_color: string | null;
}

interface Fermete {
  id: string;
  label: string;
}

interface FreeGift {
  id: string | number;
  titre: string;
  description: string | null;
  image: string | null;
  poids: number;
  products?: any[];
  dimensions?: any[];
}

interface Product {
  id: string;
  name: string;
}

export default function AdminSettings() {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [dimCurrentPage, setDimCurrentPage] = useState(1);
  const [dimRowsPerPage, setDimRowsPerPage] = useState(5);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dimension | null>(null);
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [isStandard, setIsStandard] = useState(false);
  const [selectedGiftIds, setSelectedGiftIds] = useState<string[]>([]);

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Categorie | null>(null);
  const [catForm, setCatForm] = useState<{
    label: string;
    image_file: File | null;
    image_preview: string;
    description: string;
    color: string;
    text_color: string;
  }>({ label: "", image_file: null, image_preview: "", description: "", color: "#f5f0eb", text_color: "#1a1a2e" });

  const [fermetes, setFermetes] = useState<Fermete[]>([]);
  const [fermOpen, setFermOpen] = useState(false);
  const [fermEditing, setFermEditing] = useState<Fermete | null>(null);
  const [fermLabel, setFermLabel] = useState("");

  const [freeGifts, setFreeGifts] = useState<FreeGift[]>([]);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftEditing, setGiftEditing] = useState<FreeGift | null>(null);
  const [giftForm, setGiftForm] = useState<{
    titre: string;
    description: string;
    image_file: File | null;
    image_preview: string;
    poids: number;
  }>({ titre: "", description: "", image_file: null, image_preview: "", poids: 0 });

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [contactSettings, setContactSettings] = useState({
    contact_phone: "",
    contact_email: "",
    contact_address: "",
    contact_hours: "",
    top_banner_text: "",
    footer_description: ""
  });

  const [trustBadges, setTrustBadges] = useState([
    { icon: "Truck", title: "Livraison gratuite", sub: "Partout en Tunisie" },
    { icon: "CreditCard", title: "Paiement à la livraison", sub: "Sans frais cachés" },
    { icon: "ShieldCheck", title: "Garantie 10 ans", sub: "Sur tous nos matelas" },
    { icon: "Clock", title: "Service client 24/7", sub: "+216 71 000 000" },
  ]);

  const { socials, icons, refresh: loadSocials } = useSocialNetworks();
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialEditing, setSocialEditing] = useState<SocialNetwork | null>(null);
  const [socialForm, setSocialForm] = useState({
    name: "",
    url: "",
    icon_id: "",
    is_active: true
  });

  const load = async () => {
    try {
      const data = await api.get<Dimension[]>(`/dimensions?t=${Date.now()}`);
      // Ensure local state preserves returned order
      setDimensions(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des dimensions");
    }
  };

  const loadCat = async () => {
    try { setCategories((await api.get<Categorie[]>("/categories")) || []); } catch (e) { toast.error("Erreur catégories"); }
  };

  const loadFerm = async () => {
    try { setFermetes((await api.get<Fermete[]>("/fermetes")) || []); } catch (e) { toast.error("Erreur fermetés"); }
  };

  const loadGifts = async () => {
    try {
      // Ajouter un timestamp pour éviter le cache navigateur
      const data = await api.get<FreeGift[]>(`/free-gifts?t=${Date.now()}`);
      setFreeGifts([...(data || [])]);
    } catch (e) {
      toast.error("Erreur offres");
    }
  };

  const loadProducts = async () => {
    try { setProducts((await api.get<Product[]>("/products")) || []); } catch (e) { toast.error("Erreur produits"); }
  };

  const loadSettings = async () => {
    try {
      const data = await api.get<any>("/settings");
      if (data) {
        setContactSettings((prev) => ({
          contact_phone: data.contact_phone || "",
          contact_email: data.contact_email || "",
          contact_address: data.contact_address || "",
          contact_hours: data.contact_hours || "",
          top_banner_text: data.top_banner_text || "🚚 Livraison gratuite partout en Tunisie | 📞 71 000 000 | Paiement à la livraison",
          footer_description: data.footer_description || "Matelas N°1 en Tunisie depuis 1993. Qualité, confort et hygiène pour votre sommeil."
        }));
        if (data.trust_badges) {
          try {
            const parsed = JSON.parse(data.trust_badges);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTrustBadges(parsed);
            }
          } catch(e) {}
        }
      }
    } catch (e) {
      // Ignorer
    }
  };

  useEffect(() => { load(); loadCat(); loadFerm(); loadGifts(); loadProducts(); loadSettings(); }, []);

  const handleSaveSettings = async () => {
    try {
      await api.post("/settings", { 
        settings: {
          ...contactSettings,
          trust_badges: JSON.stringify(trustBadges)
        }
      });
      toast.success("Paramètres de contact enregistrés");
    } catch {
      toast.error("Erreur lors de l'enregistrement des paramètres");
    }
  };

  const handleSave = async () => {
    const finalLabel = `${width}×${length}`;
    if (!width.trim() || !length.trim()) {
      toast.error("Veuillez remplir les deux dimensions");
      return;
    }
    try {
      if (editing) {
        await api.put(`/dimensions/${editing.id}`, { 
          label: finalLabel, 
          is_standard: isStandard,
          free_gift_ids: selectedGiftIds
        });
        toast.success("Dimension mise à jour");
      } else {
        await api.post("/dimensions", { 
          label: finalLabel, 
          is_standard: isStandard,
          free_gift_ids: selectedGiftIds
        });
        toast.success("Dimension ajoutée");
      }
      setOpen(false);
      setWidth("");
      setLength("");
      setIsStandard(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cette dimension ?", "Cette taille ne pourra plus être sélectionnée pour les nouveaux produits."))) return;
    try {
      await api.delete(`/dimensions/${id}`);
      toast.success("Dimension supprimée");
      load();
    } catch (err: any) {
      toast.error("Impossible de supprimer cette dimension (elle est peut-être utilisée)");
    }
  };

  // Drag & drop ordering (immediate visual reordering via drag-enter)
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const draggedRef = useRef<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    draggedRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = draggedRef.current;
    if (!draggedId || draggedId === targetId) return;

    setDimensions((prev) => {
      const current = [...prev];
      const fromIdx = current.findIndex((d) => d.id === draggedId);
      const toIdx = current.findIndex((d) => d.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const [moved] = current.splice(fromIdx, 1);
      current.splice(toIdx, 0, moved);
      
      // Update drag order for auto-save
      setDragOrder(current.map(d => d.id));
      return current;
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    draggedRef.current = null;
  };

  const onDragEnd = () => {
    draggedRef.current = null;
  };

  const moveUp = (id: string) => {
    setDimensions((prev) => {
      const current = [...prev];
      const idx = current.findIndex((d) => d.id === id);
      if (idx <= 0) return prev;
      const [item] = current.splice(idx, 1);
      current.splice(idx - 1, 0, item);
      setDragOrder(current.map(d => d.id));
      return current;
    });
  };

  const moveDown = (id: string) => {
    setDimensions((prev) => {
      const current = [...prev];
      const idx = current.findIndex((d) => d.id === id);
      if (idx === -1 || idx >= current.length - 1) return prev;
      const [item] = current.splice(idx, 1);
      current.splice(idx + 1, 0, item);
      setDragOrder(current.map(d => d.id));
      return current;
    });
  };

  // Auto-save reorder with debounce (400ms for more instant feel)
  useEffect(() => {
    if (!dragOrder || dragOrder.length === 0) return;
    const t = setTimeout(() => {
      handleSaveOrder();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragOrder]);

  const handleSaveOrder = async () => {
    if (!dragOrder || dragOrder.length === 0) return;
    try {
      await api.post('/dimensions/reorder', { ids: dragOrder });
      toast.success('Ordre des dimensions enregistré');
      setDragOrder(null);
      // Removed load() to prevent "revert" flicker. The local state is already correct.
    } catch (err: any) {
      toast.error('Erreur lors de l\'enregistrement de l\'ordre');
      load(); // Revert to server state only on error
    }
  };

  const handleCatSave = async () => {
    if (!catForm.label.trim()) return toast.error("Veuillez remplir le nom");
    const formData = new FormData();
    formData.append("label", catForm.label);
    formData.append("description", catForm.description);
    formData.append("color", catForm.color);
    formData.append("text_color", catForm.text_color);

    if (catForm.image_file) {
      formData.append("image", catForm.image_file);
    } else if (catForm.image_preview) {
      formData.append("image", catForm.image_preview);
    } else {
      formData.append("image", "");
    }

    try {
      if (catEditing) {
        formData.append("_method", "PUT");
        await api.post(`/categories/${catEditing.id}`, formData);
        toast.success("Catégorie mise à jour");
      } else {
        await api.post("/categories", formData);
        toast.success("Catégorie ajoutée");
      }
      setCatOpen(false); setCatForm({ label: "", image_file: null, image_preview: "", description: "", color: "#f5f0eb", text_color: "#1a1a2e" }); setCatEditing(null); loadCat();
    } catch { toast.error("Erreur d'enregistrement"); }
  };

  const handleCatDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cette catégorie ?", "Impossible d'annuler."))) return;
    try { await api.delete(`/categories/${id}`); toast.success("Supprimée"); loadCat(); } catch { toast.error("Erreur"); }
  };

  const handleFermSave = async () => {
    if (!fermLabel.trim()) return toast.error("Label requis");
    try {
      if (fermEditing) {
        await api.put(`/fermetes/${fermEditing.id}`, { label: fermLabel });
      } else {
        await api.post("/fermetes", { label: fermLabel });
      }
      toast.success("Enregistré");
      setFermOpen(false); setFermLabel(""); setFermEditing(null); loadFerm();
    } catch { toast.error("Erreur d'enregistrement"); }
  };

  const handleFermDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ?", "Impossible d'annuler."))) return;
    try { await api.delete(`/fermetes/${id}`); toast.success("Supprimé"); loadFerm(); } catch { toast.error("Erreur"); }
  };

  const handleGiftSave = async () => {
    if (!giftForm.titre.trim()) return toast.error("Titre requis");
    if (giftForm.poids < 0) return toast.error("Poids invalide");

    const formData = new FormData();
    formData.append("titre", giftForm.titre);
    formData.append("description", giftForm.description);
    formData.append("poids", giftForm.poids.toString());

    // Ajouter les produits sélectionnés
    selectedProductIds.forEach((id) => {
      formData.append("product_ids[]", id);
    });

    // Ajouter les dimensions sélectionnées
    selectedGiftIds.forEach((id) => {
      formData.append("dimension_ids[]", id);
    });

    if (giftForm.image_file) {
      formData.append("image", giftForm.image_file);
    } else if (giftForm.image_preview) {
      formData.append("image", giftForm.image_preview);
    } else {
      formData.append("image", "");
    }

    try {
      if (giftEditing) {
        formData.append("_method", "PUT");
        await api.post(`/free-gifts/${giftEditing.id}`, formData);
        toast.success("Offre mise à jour");
      } else {
        await api.post("/free-gifts", formData);
        toast.success("Offre ajoutée");
      }

      setGiftOpen(false);
      setGiftForm({ titre: "", description: "", image_file: null, image_preview: "", poids: 0 });
      setSelectedProductIds([]);
      setSelectedGiftIds([]);
      setGiftEditing(null);

      // Rafraîchir les listes (offres et dimensions car elles sont liées)
      setTimeout(() => {
        loadGifts();
        load();
      }, 300);
    } catch (err: any) {
      toast.error(err.message || "Erreur d'enregistrement");
    }
  };

  const handleGiftDelete = async (id: string | number) => {
    if (!(await confirmDelete("Supprimer cette offre ?", "Impossible d'annuler."))) return;
    try {
      await api.delete(`/free-gifts/${id}`);
      toast.success("Offre supprimée");
      setTimeout(() => {
        loadGifts();
      }, 300);
    } catch {
      toast.error("Erreur");
    }
  };

  const handleSocialSave = async () => {
    if (!socialForm.name.trim() || !socialForm.url.trim() || !socialForm.icon_id) {
      return toast.error("Veuillez remplir tous les champs");
    }
    try {
      if (socialEditing) {
        await api.put(`/social-networks/${socialEditing.id}`, socialForm);
        toast.success("Réseau social mis à jour");
      } else {
        await api.post("/social-networks", socialForm);
        toast.success("Réseau social ajouté");
      }
      setSocialOpen(false);
      setSocialForm({ name: "", url: "", icon_id: "", is_active: true });
      setSocialEditing(null);
      loadSocials();
    } catch { toast.error("Erreur d'enregistrement"); }
  };

  const handleSocialDelete = async (id: number) => {
    if (!(await confirmDelete("Supprimer ?", "Cette action est irréversible."))) return;
    try {
      await api.delete(`/social-networks/${id}`);
      toast.success("Supprimé");
      loadSocials();
    } catch { toast.error("Erreur"); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Paramétrages du Magasin</h1>
          <p className="text-sm text-muted-foreground">Gérez les données globales et réglages de la boutique</p>
        </div>
      </div>

      <Tabs defaultValue="catalogue" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="catalogue" className="gap-2"><Layers className="w-4 h-4" /> Catalogue</TabsTrigger>
          <TabsTrigger value="offres" className="gap-2"><Gift className="w-4 h-4" /> Offres Gratuites</TabsTrigger>
          <TabsTrigger value="boutique" className="gap-2"><Store className="w-4 h-4" /> Boutique & Contact</TabsTrigger>
          <TabsTrigger value="social" className="gap-2"><Share2 className="w-4 h-4" /> Réseaux Sociaux</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Dimensions Section */}

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Dimensions des Matelas</h2>
                  </div>
                  <Dialog open={open} onOpenChange={(v) => {
                    setOpen(v);
                    if (!v) { setEditing(null); setWidth(""); setLength(""); setIsStandard(false); }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter une dimension</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
                      <DialogHeader className="p-6 pb-2">
                        <DialogTitle>{editing ? "Modifier la dimension" : "Ajouter une dimension"}</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Dimension (Largeur × Longueur)</label>
                          <div className="flex items-center gap-3">
                            <Input
                              value={width}
                              onChange={(e) => setWidth(e.target.value)}
                              placeholder="140"
                              className="text-center"
                            />
                            <span className="font-bold text-muted-foreground">×</span>
                            <Input
                              value={length}
                              onChange={(e) => setLength(e.target.value)}
                              placeholder="190"
                              className="text-center"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isStandard}
                            onCheckedChange={setIsStandard}
                          />
                          <label className="text-sm font-medium">Dimension standard (affichée par défaut)</label>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Offres gratuites pour cette dimension</label>
                          <div className="bg-background rounded-lg border border-border p-3 max-h-40 overflow-y-auto space-y-1">
                            {freeGifts.map(gift => (
                              <label key={gift.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1.5 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selectedGiftIds.includes(gift.id.toString())}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedGiftIds([...selectedGiftIds, gift.id.toString()]);
                                    else setSelectedGiftIds(selectedGiftIds.filter(id => id !== gift.id.toString()));
                                  }}
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm">{gift.titre}</span>
                              </label>
                            ))}
                            {freeGifts.length === 0 && <p className="text-xs text-muted-foreground italic">Aucune offre configurée</p>}
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-2 border-t bg-muted/20">
                        <Button onClick={handleSave} className="w-full">
                          {editing ? "Mettre à jour" : "Ajouter"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-3 mb-4 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 w-fit">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Afficher :</span>
                  <select 
                    value={dimRowsPerPage} 
                    onChange={(e) => { setDimRowsPerPage(parseInt(e.target.value)); setDimCurrentPage(1); }}
                    className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="5">5 lignes</option>
                    <option value="10">10 lignes</option>
                    <option value="20">20 lignes</option>
                    <option value="50">50 lignes</option>
                  </select>
                </div>

                <div className="bg-background border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dimensions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Aucune dimension paramétrée
                          </TableCell>
                        </TableRow>
                      ) : (
                        dimensions
                          .slice((dimCurrentPage - 1) * dimRowsPerPage, dimCurrentPage * dimRowsPerPage)
                          .map((d) => (
                          <TableRow key={d.id} draggable onDragStart={(e) => onDragStart(e, d.id)} onDragOver={onDragOver} onDragEnter={(e) => onDragEnter(e, d.id)} onDrop={onDrop} onDragEnd={onDragEnd} className="cursor-grab">
                            <TableCell className="font-medium flex items-center gap-3">
                              <span className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">☰</span>
                              {d.label}
                            </TableCell>
                            <TableCell>
                              {d.is_standard ? (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">Standard</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Secondaire</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditing(d);
                                    const [w, l] = d.label.split("×");
                                    setWidth(w || "");
                                    setLength(l || "");
                                    setIsStandard(d.is_standard);
                                    setSelectedGiftIds(d.free_gifts?.map(g => g.id.toString()) || []);
                                    setOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(d.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => moveUp(d.id)}><ArrowUp className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => moveDown(d.id)}><ArrowDown className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {dragOrder && (
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" onClick={() => { setDragOrder(null); load(); }} variant="ghost">Annuler</Button>
                    <Button size="sm" onClick={handleSaveOrder}>Enregistrer l'ordre</Button>
                  </div>
                )}

                {dimensions.length > dimRowsPerPage && (
                  <div className="flex items-center justify-between mt-4 px-1">
                    <span className="text-xs text-muted-foreground">
                      Total: {dimensions.length} dimensions
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={dimCurrentPage === 1}
                        onClick={() => setDimCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-medium">
                        {dimCurrentPage} / {Math.ceil(dimensions.length / dimRowsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={dimCurrentPage >= Math.ceil(dimensions.length / dimRowsPerPage)}
                        onClick={() => setDimCurrentPage(p => p + 1)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fermetés - In Catalogue but second col if possible, or below Dimensions */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Feather className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Fermetés</h2>
                  </div>
                  <Dialog open={fermOpen} onOpenChange={(v) => {
                    setFermOpen(v);
                    if (!v) { setFermEditing(null); setFermLabel(""); }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{fermEditing ? "Modifier" : "Ajouter"} une fermeté</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nom (ex: mi-ferme)</label>
                          <Input value={fermLabel} onChange={(e) => setFermLabel(e.target.value)} />
                        </div>
                        <Button onClick={handleFermSave} className="w-full">Enregistrer</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="bg-background border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fermetes.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium capitalize">{f.label}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setFermEditing(f); setFermLabel(f.label); setFermOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleFermDelete(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {fermetes.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4">Aucune fermeté</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {/* Categories Section */}

              <div className="bg-card border border-border rounded-xl p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Catégories (Collections)</h2>
                  </div>
                  <Dialog open={catOpen} onOpenChange={(v) => {
                    setCatOpen(v);
                    if (!v) { setCatEditing(null); setCatForm({ label: "", image_file: null, image_preview: "", description: "", color: "#f5f0eb", text_color: "#1a1a2e" }); }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{catEditing ? "Modifier" : "Ajouter"} une catégorie</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nom (ex: orthopédique)</label>
                          <Input value={catForm.label} onChange={(e) => setCatForm({ ...catForm, label: e.target.value })} />
                        </div>
                        <ImageUpload
                          value={catForm.image_file}
                          onChange={(f) => setCatForm({ ...catForm, image_file: f, image_preview: f ? catForm.image_preview : "" })}
                          preview={catForm.image_preview}
                          label="Image (remplace l'emoji)"
                          placeholder="Cliquez pour uploader"
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description (ex: Soutien ferme)</label>
                          <Input value={catForm.description || ""} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Couleur de fond</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={catForm.color || "#f5f0eb"}
                                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
                              />
                              <Input
                                value={catForm.color || ""}
                                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                                placeholder="#f5f0eb"
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Couleur du texte</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={catForm.text_color || "#1a1a2e"}
                                onChange={(e) => setCatForm({ ...catForm, text_color: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
                              />
                              <Input
                                value={catForm.text_color || ""}
                                onChange={(e) => setCatForm({ ...catForm, text_color: e.target.value })}
                                placeholder="#1a1a2e"
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Aperçu</label>
                          <div
                            className="rounded-xl p-4 text-center text-sm font-bold capitalize"
                            style={{ backgroundColor: catForm.color || "#f5f0eb", color: catForm.text_color || "#1a1a2e" }}
                          >
                            {catForm.label || "Nom de la catégorie"}
                          </div>
                        </div>
                        <Button onClick={handleCatSave} className="w-full">Enregistrer</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="bg-background border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Détails</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium capitalize">{c.label}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {c.image ? <img src={c.image} alt="" className="w-8 h-8 rounded-md object-cover" /> : <Layers className="w-6 h-6 opacity-50" />}
                              <span>{c.description}</span>
                              {c.color && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                  <span className="w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: c.color }} />
                                  <span className="w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: c.text_color || "#1a1a2e" }} />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setCatEditing(c); setCatForm({ label: c.label, image_file: null, image_preview: c.image || "", description: c.description || "", color: c.color || "#f5f0eb", text_color: c.text_color || "#1a1a2e" }); setCatOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleCatDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categories.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-4">Aucune catégorie</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="offres" className="space-y-6">
          <div className="max-w-6xl">
            <div className="space-y-6">
              {/* Free Gifts & Offers */}
              <div className="bg-card border border-border rounded-xl p-6 mt-0 mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Offres Gratuites</h2>
                  </div>
                  <Dialog open={giftOpen} onOpenChange={(v) => {
                    setGiftOpen(v);
                    if (!v) { setGiftEditing(null); setGiftForm({ titre: "", description: "", image_file: null, image_preview: "", poids: 0 }); setSelectedProductIds([]); setSelectedGiftIds([]); }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter une offre</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                      <DialogHeader className="p-6 pb-2">
                        <DialogTitle>{giftEditing ? "Modifier" : "Ajouter"} une offre gratuite</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Titre (ex: Oreiller gratuit)</label>
                          <Input value={giftForm.titre} onChange={(e) => setGiftForm({ ...giftForm, titre: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Input value={giftForm.description} onChange={(e) => setGiftForm({ ...giftForm, description: e.target.value })} placeholder="Détails de l'offre" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Poids disponible (grammes)</label>
                          <Input type="number" min="0" value={giftForm.poids} onChange={(e) => setGiftForm({ ...giftForm, poids: parseInt(e.target.value) || 0 })} />
                        </div>
                        <ImageUpload
                          value={giftForm.image_file}
                          onChange={(f) => setGiftForm({ ...giftForm, image_file: f })}
                          preview={giftForm.image_preview}
                          label="Image (optionnelle)"
                          placeholder="Cliquez pour uploader"
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Dimensions associées (sélectionnez les dimensions pour lesquelles cette offre s'applique)</label>
                          <div className="bg-background rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                            {dimensions.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Aucune dimension disponible</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {dimensions.map((dim) => (
                                  <label key={dim.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded border border-transparent hover:border-border transition-all">
                                    <input
                                      type="checkbox"
                                      checked={selectedGiftIds.includes(dim.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedGiftIds([...selectedGiftIds, dim.id]);
                                        } else {
                                          setSelectedGiftIds(selectedGiftIds.filter(id => id !== dim.id));
                                        }
                                      }}
                                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                    />
                                    <span className="text-xs font-bold">{dim.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-2 border-t bg-muted/20">
                        <Button onClick={handleGiftSave} className="w-full">Enregistrer</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="bg-background border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Poids (g)</TableHead>
                        <TableHead>Dimensions</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {freeGifts.map((gift) => (
                        <TableRow key={gift.id}>
                          <TableCell className="font-medium">{gift.titre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{gift.description || "-"}</TableCell>
                          <TableCell>
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm font-bold">{gift.poids}g</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {gift.dimensions && gift.dimensions.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-[300px] max-h-[120px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
                                {gift.dimensions.map((d: any) => (
                                  <Badge key={d.id} variant="secondary" className="text-[10px] font-bold">
                                    {d.label}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground opacity-50">Aucune dimension</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                setGiftEditing(gift);
                                setGiftForm({
                                  titre: gift.titre,
                                  description: gift.description || "",
                                  image_file: null,
                                  image_preview: gift.image || "",
                                  poids: gift.poids
                                });
                                // Charger les dimensions associées
                                if (gift.dimensions && Array.isArray(gift.dimensions)) {
                                  setSelectedGiftIds(gift.dimensions.map((d: any) => (d.id || d).toString()));
                                } else {
                                  setSelectedGiftIds([]);
                                }
                                setGiftOpen(true);
                              }}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleGiftDelete(gift.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {freeGifts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4">Aucune offre gratuite</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="boutique" className="space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-5xl mx-auto shadow-sm mt-4">
            <div className="flex items-center gap-3 mb-8 border-b border-border/40 pb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Paramètres de la Boutique</h2>
                <p className="text-xs text-muted-foreground">Informations de contact et affichages globaux du site.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h3 className="font-bold text-sm tracking-wide uppercase text-primary/80 bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">Coordonnées de l'entreprise</h3>
                <div className="space-y-5 px-1">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Téléphone Principal</label>
                    <Input className="bg-muted/30 border-border/60 shadow-sm" value={contactSettings.contact_phone} onChange={e => setContactSettings({ ...contactSettings, contact_phone: e.target.value })} placeholder="+216 ..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse Email</label>
                    <Input className="bg-muted/30 border-border/60 shadow-sm" type="email" value={contactSettings.contact_email} onChange={e => setContactSettings({ ...contactSettings, contact_email: e.target.value })} placeholder="contact@..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse du Siège</label>
                    <Input className="bg-muted/30 border-border/60 shadow-sm" value={contactSettings.contact_address} onChange={e => setContactSettings({ ...contactSettings, contact_address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horaires Standards</label>
                    <Input className="bg-muted/30 border-border/60 shadow-sm" value={contactSettings.contact_hours} onChange={e => setContactSettings({ ...contactSettings, contact_hours: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-bold text-sm tracking-wide uppercase text-primary/80 bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">Textes d'affichage du site</h3>
                <div className="space-y-5 px-1">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ruban Annonce (Header)</label>
                    <Input className="bg-muted/30 border-border/60 shadow-sm" value={contactSettings.top_banner_text} onChange={e => setContactSettings({ ...contactSettings, top_banner_text: e.target.value })} />
                    <p className="text-[10px] text-muted-foreground/70">Ce texte s'affiche tout en haut du site web.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description de la marque (Footer)</label>
                    <textarea
                      className="w-full px-3 py-3 border border-border/60 shadow-sm bg-muted/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary h-[200px] resize-none"
                      value={contactSettings.footer_description}
                      onChange={e => setContactSettings({ ...contactSettings, footer_description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Trust Badges Config */}
              <div className="space-y-6 md:col-span-2">
                <h3 className="font-bold text-sm tracking-wide uppercase text-primary/80 bg-primary/5 px-3 py-2 rounded-lg border border-primary/10 flex justify-between items-center">
                  <span>Badges de Confiance (Accueil & 3D)</span>
                  <Button variant="outline" size="sm" onClick={() => setTrustBadges([...trustBadges, { icon: "Star", title: "Nouveau Badge", sub: "Description" }])}>
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
                  {trustBadges.map((badge, idx) => (
                    <div key={idx} className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3 relative group shadow-sm transition-all hover:border-primary/50">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80" onClick={() => {
                        const newB = [...trustBadges];
                        newB.splice(idx, 1);
                        setTrustBadges(newB);
                      }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex justify-between">
                          <span>Nom d'icône (Lucide)</span>
                          <LucideIcon name={badge.icon} className="w-3 h-3 text-primary" />
                        </label>
                        <Input value={badge.icon} onChange={(e) => { const newB = [...trustBadges]; newB[idx].icon = e.target.value; setTrustBadges(newB); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Titre</label>
                        <Input value={badge.title} onChange={(e) => { const newB = [...trustBadges]; newB[idx].title = e.target.value; setTrustBadges(newB); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Sous-titre</label>
                        <Input value={badge.sub} onChange={(e) => { const newB = [...trustBadges]; newB[idx].sub = e.target.value; setTrustBadges(newB); }} className="h-8 text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            
            <div className="mt-8 flex justify-end pt-6 border-t border-border/40">
              <Button onClick={handleSaveSettings} size="lg" className="px-8 shadow-lg shadow-primary/20">
                Enregistrer les modifications
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="social">
          {/* Réseaux Sociaux Dynamiques */}
          <div className="bg-card border border-border rounded-xl p-6 mt-4 mb-20 max-w-5xl mx-auto shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Réseaux Sociaux Dynamiques</h2>
              </div>
              <Dialog open={socialOpen} onOpenChange={(v) => {
                setSocialOpen(v);
                if (!v) { setSocialEditing(null); setSocialForm({ name: "", url: "", icon_id: "", is_active: true }); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter un réseau</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{socialEditing ? "Modifier" : "Ajouter"} un réseau social</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom (ex: Facebook)</label>
                      <Input value={socialForm.name} onChange={(e) => setSocialForm({ ...socialForm, name: e.target.value })} placeholder="Facebook" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {(socialForm.name.toLowerCase().includes('whatsapp') || (icons.find(i => i.id.toString() === socialForm.icon_id)?.name.toLowerCase().includes('whatsapp'))) 
                          ? "Numéro WhatsApp (ex: 21612345678)" 
                          : "URL"}
                      </label>
                      <Input 
                        value={socialForm.url} 
                        onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })} 
                        placeholder={(socialForm.name.toLowerCase().includes('whatsapp') || (icons.find(i => i.id.toString() === socialForm.icon_id)?.name.toLowerCase().includes('whatsapp'))) 
                          ? "216XXXXXXXX" 
                          : "https://..."} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Icone</label>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border border-border rounded-lg bg-muted/50">
                        {icons.map((icon) => (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => setSocialForm({ ...socialForm, icon_id: icon.id.toString() })}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${socialForm.icon_id === icon.id.toString() ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-background'}`}
                          >
                            <div style={{ color: icon.hex_color || 'currentColor' }}>
                              <LucideIcon name={icon.lucide_name} label={icon.name} className="w-5 h-5 mb-1" />
                            </div>
                            <span className="text-[10px] truncate w-full text-center">{icon.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={socialForm.is_active}
                        onCheckedChange={(v) => setSocialForm({ ...socialForm, is_active: v })}
                      />
                      <label className="text-sm font-medium">Activé</label>
                    </div>
                    <Button onClick={handleSocialSave} className="w-full">Enregistrer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plateforme</TableHead>
                    <TableHead>Icone</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {socials.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold">{s.name}</TableCell>
                      <TableCell>
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center" style={{ color: s.icon.hex_color || 'currentColor' }}>
                          <LucideIcon name={s.icon.lucide_name} label={s.name} className="w-4 h-4" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{s.url}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSocialEditing(s);
                            setSocialForm({ name: s.name, url: s.url, icon_id: s.icon_id.toString(), is_active: !!s.is_active });
                            setSocialOpen(true);
                          }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleSocialDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {socials.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun réseau social configuré</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </AdminLayout>
  );
}
