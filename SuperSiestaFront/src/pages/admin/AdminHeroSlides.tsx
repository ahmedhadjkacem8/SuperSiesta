import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { getImageUrl } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import { Pencil, Trash2, Plus, Save, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { useProducts } from "@/hooks/useProducts";
import { useGammes } from "@/hooks/useGammes";
import { useBlogPosts } from "@/hooks/useBlog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useHeroSlides, useHeroSlidesActions, HeroSlide } from "@/hooks/useHeroSlides";

interface FormState {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_file: File | null;
  image_preview: string;
  active: boolean;
}

export default function AdminHeroSlides() {
  const { data: slides = [], isLoading: slidesLoading } = useHeroSlides();
  const slideMutation = useHeroSlidesActions();
  
  const [editSlide, setEditSlide] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "",
    subtitle: "",
    cta_text: "",
    cta_link: "",
    image_file: null,
    image_preview: "",
    active: true,
  });

  const { data: products } = useProducts();
  const { data: gammes } = useGammes();
  const { data: posts = [] } = useBlogPosts();

  const staticPages = [
    { label: "Accueil", value: "/" },
    { label: "Boutique", value: "/boutique" },
    { label: "À propos", value: "/a-propos" },
    { label: "Contact", value: "/contact" },
    { label: "Blog", value: "/blog" },
    { label: "Mon Panier / Commander", value: "/commander" },
  ];

  const gammeLinks = (gammes || []).map(g => ({ label: `Gamme: ${g.name}`, value: `/gamme/${g.slug}` }));
  const productLinks = (products || []).map(p => ({ label: `Produit: ${p.name}`, value: `/produit/${p.slug}` }));
  const blogLinks = (posts || []).map(p => ({ label: `Blog: ${p.title}`, value: `/blog/${p.slug}` }));

  const allLinks = [...staticPages, ...gammeLinks, ...productLinks, ...blogLinks];
  const isCustomLink = !!form.cta_link && !allLinks.some(l => l.value === form.cta_link);

  const openEdit = (s: HeroSlide) => {
    setEditSlide(s);
    const newForm: FormState = {
      title: s.title || "",
      subtitle: s.subtitle || "",
      cta_text: s.cta_text || "",
      cta_link: s.cta_link || "",
      image_file: null,
      image_preview: s.image_url || "",
      active: s.active || false,
    };
    setForm(newForm);
  };

  const openNew = () => {
    setEditSlide({ id: "new" } as HeroSlide);
    setForm({
      title: "",
      subtitle: "",
      cta_text: "",
      cta_link: "",
      image_file: null,
      image_preview: "",
      active: true,
    });
  };

  const resetForm = () => {
    setForm({
      title: "",
      subtitle: "",
      cta_text: "",
      cta_link: "",
      image_file: null,
      image_preview: "",
      active: true,
    });
  };

  const handleSave = async () => {
    if (!editSlide) return;
    
    if (!form.image_file && !form.image_preview) {
      toast.error("Une image est requise");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("subtitle", form.subtitle);
    formData.append("cta_text", form.cta_text);
    formData.append("cta_link", form.cta_link);
    
    if (form.image_file) {
      formData.append("image_url", form.image_file);
    }
    
    formData.append("active", form.active ? "1" : "0");

    try {
      if (editSlide.id === "new") {
        const maxOrder = slides.length > 0 ? Math.max(...slides.map(s => s.sort_order)) + 1 : 0;
        formData.append("sort_order", String(maxOrder));
        await slideMutation.mutateAsync({ data: formData });
        toast.success("Slide ajoutée");
      } else {
        await slideMutation.mutateAsync({ id: editSlide.id, data: formData });
        toast.success("Slide mise à jour");
      }
      setEditSlide(null);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cette slide ?", "L'image et les textes seront définitivement retirés du slider."))) return;
    try {
      await slideMutation.mutateAsync({ id, method: 'DELETE', data: null });
      toast.success("Slide supprimée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    if (slideMutation.isPending) return;
    
    const idx = slides.findIndex(s => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= slides.length) return;
    
    const a = slides[idx];
    const b = slides[swapIdx];

    try {
      // Swapping sort_orders
      const orderA = b.sort_order;
      const orderB = a.sort_order;

      // Single update is fine as success invalidates queries
      await Promise.all([
        slideMutation.mutateAsync({ id: a.id, data: { sort_order: orderA } }),
        slideMutation.mutateAsync({ id: b.id, data: { sort_order: orderB } })
      ]);
      
      toast.success("Position mise à jour");
    } catch (err: any) {
      toast.error("Erreur lors du déplacement");
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hero Slides</h1>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nouvelle slide</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Gérez les slides du carrousel hero sur la page d'accueil.</p>

      <div className="space-y-3">
        {slides.map((s, i) => (
          <div key={s.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
            {s.image_url && <img src={`${getImageUrl(s.image_url)}${s.image_url.includes('?') ? '&' : '?'}_=${Date.now()}`} alt="" className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm line-clamp-1">{s.title || "(Sans titre)"}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-normal">{s.subtitle}</p>
              {!s.active && <span className="text-xs text-destructive font-medium">Inactive</span>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => move(s.id, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => move(s.id, 1)} disabled={i === slides.length - 1}><ArrowDown className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {slides.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune slide. Cliquez sur "Nouvelle slide" pour commencer.</p>}
      </div>

      <Dialog open={!!editSlide} onOpenChange={(v) => { 
        if (!v) {
          setEditSlide(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSlide?.id === "new" ? "Nouvelle slide" : "Modifier la slide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Sous-titre</label>
              <Textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Texte CTA</label>
                <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Voir nos produits" />
              </div>
              <div>
                <label className="text-sm font-medium">Lien CTA</label>
                <Select value={form.cta_link} onValueChange={(v) => setForm({ ...form, cta_link: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir une page" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectGroup>
                      <SelectLabel>Pages statiques</SelectLabel>
                      {staticPages.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectGroup>
                    
                    {gammeLinks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Gammes</SelectLabel>
                        {gammeLinks.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {productLinks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Produits</SelectLabel>
                        {productLinks.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {blogLinks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Articles Blog</SelectLabel>
                        {blogLinks.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {isCustomLink && (
                      <SelectGroup>
                        <SelectLabel>Lien personnalisé</SelectLabel>
                        <SelectItem value={form.cta_link}>{form.cta_link}</SelectItem>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <ImageUpload
                value={form.image_file}
                onChange={(file) => setForm({ ...form, image_file: file })}
                folder="banners"
                label="Image du héros"
                placeholder="Glissez ou cliquez pour uploader l'image"
                preview={form.image_preview}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <label className="text-sm">Active</label>
            </div>
            <Button onClick={handleSave} className="w-full"><Save className="w-4 h-4 mr-1" /> Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
