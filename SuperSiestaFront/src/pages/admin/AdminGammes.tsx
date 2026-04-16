import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import MultiImageUpload from "@/components/MultiImageUpload";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Video, Image, Box } from "lucide-react";
import { api } from "@/lib/apiClient";
import VideoUpload from "@/components/VideoUpload";
import { confirmDelete } from "@/lib/swal";

interface Gamme {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  video_url: string | null;
  cover_image: string | null;
  photos: string[];
  images_3d: string[];
  sort_order: number;
}


interface FormState {
  name: string;
  description: string;
  cover_image_file: File | null;
  cover_image_preview: string;
  video_file: File | null;
  video_preview: string;
  photos_files: File[];
  photos_preview: string[];
  images_3d_files: File[];
  images_3d_preview: string[];
}

export default function AdminGammes() {
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gamme | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    cover_image_file: null,
    cover_image_preview: "",
    video_file: null,
    video_preview: "",
    photos_files: [],
    photos_preview: [],
    images_3d_files: [],
    images_3d_preview: [],
  });

  const load = async () => {
    try {
      const data = await api.get<Gamme[]>("/gammes");
      setGammes(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des gammes");
    }
  };

  useEffect(() => { load(); }, []);

  const generateSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      cover_image_file: null,
      cover_image_preview: "",
      video_file: null,
      video_preview: "",
      photos_files: [],
      photos_preview: [],
      images_3d_files: [],
      images_3d_preview: [],
    });
    setEditing(null);
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (g: Gamme) => {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description || "",
      cover_image_file: null,
      cover_image_preview: g.cover_image || "",
      video_file: null,
      video_preview: g.video_url || "",
      photos_files: [],
      photos_preview: g.photos || [],
      images_3d_files: [],
      images_3d_preview: g.images_3d || [],
    });
    setOpen(true);
  };

  const parseLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!form.name) { toast.error("Nom requis"); return; }
    const slug = generateSlug(form.name);
    
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("slug", slug);
    formData.append("description", form.description || "");
    formData.append("sort_order", String(editing?.sort_order ?? gammes.length));

    if (form.cover_image_file) {
      formData.append("cover_image", form.cover_image_file);
    } else if (form.cover_image_preview) {
      formData.append("cover_image", form.cover_image_preview);
    } else {
      formData.append("cover_image", "");
    }

    if (form.video_file) {
      formData.append("video_url", form.video_file);
    } else if (form.video_preview) {
      formData.append("video_url", form.video_preview);
    }

    // Append existing photo previews
    form.photos_preview.forEach((url) => {
      formData.append("photos[]", url);
    });

    // Append new photo files
    form.photos_files.forEach((file) => {
      formData.append("photos[]", file);
    });

    // Append existing 3D preview
    form.images_3d_preview.forEach((url) => {
      formData.append("images_3d[]", url);
    });

    // Append new 3D image files
    form.images_3d_files.forEach((file) => {
      formData.append("images_3d[]", file);
    });

    try {
      if (editing) {
        formData.append("_method", "PUT");
        await api.post(`/gammes/${editing.id}`, formData);
        toast.success("Gamme mise à jour");
      } else {
        await api.post("/gammes", formData);
        toast.success("Gamme créée");
      }
      setOpen(false);
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cette gamme ?", "Toutes les photos et vidéos liées seront supprimées."))) return;
    try {
      await api.delete(`/gammes/${id}`);
      toast.success("Supprimée");
      load();
    } catch (err: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = gammes.findIndex((g) => g.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= gammes.length) return;
    try {
      await Promise.all([
        api.put(`/gammes/${gammes[idx].id}`, { sort_order: gammes[swapIdx].sort_order }),
        api.put(`/gammes/${gammes[swapIdx].id}`, { sort_order: gammes[idx].sort_order }),
      ]);
      load();
    } catch (err: any) {
      toast.error("Erreur lors du déplacement");
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Gammes</h1>
          <p className="text-sm text-muted-foreground">Gérez les gammes de produits (vidéo, photos, 3D)</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nouvelle gamme</Button>
      </div>

      <div className="grid gap-4">
        {gammes.map((g) => (
          <div key={g.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="w-16 h-16 shrink-0 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
              {g.cover_image ? (
                <img src={g.cover_image} alt={g.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center px-1">Sans image</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">{g.name}</h3>
              {g.description && <p className="text-sm text-muted-foreground truncate">{g.description}</p>}
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {g.video_url && <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" /> Vidéo</span>}
                <span className="inline-flex items-center gap-1"><Image className="w-3 h-3" /> {g.photos?.length || 0} photos</span>
                <span className="inline-flex items-center gap-1"><Box className="w-3 h-3" /> {g.images_3d?.length || 0} 3D</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => move(g.id, -1)}><ArrowUp className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => move(g.id, 1)}><ArrowDown className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {gammes.length === 0 && <p className="text-center text-muted-foreground py-10">Aucune gamme. Créez la première !</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier" : "Nouvelle"} gamme</DialogTitle>
            <DialogDescription>Remplissez les informations de la gamme</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Soft+" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Description de la gamme..." />
            </div>
            <ImageUpload
              value={form.cover_image_file}
              onChange={(file) => setForm({ ...form, cover_image_file: file, cover_image_preview: file ? form.cover_image_preview : "" })}
              preview={form.cover_image_preview}
              label="Image de couverture"
              placeholder="Cliquez pour uploader une image de couverture"
            />
            <VideoUpload
              value={form.video_file}
              onChange={(file) => setForm({ ...form, video_file: file, video_preview: file ? form.video_preview : "" })}
              preview={form.video_preview}
              label="Vidéo (format Reel)"
              placeholder="Cliquez pour uploader une vidéo"
            />
            <MultiImageUpload
              value={form.photos_files}
              onChange={(files) => setForm({ ...form, photos_files: files })}
              onRemoveExisting={(idx) => setForm({ ...form, photos_preview: form.photos_preview.filter((_, i) => i !== idx) })}
              preview={form.photos_preview}
              label="Photos"
              placeholder="Glissez ou cliquez pour uploader les photos"
            />
            <MultiImageUpload
              value={form.images_3d_files}
              onChange={(files) => setForm({ ...form, images_3d_files: files })}
              onRemoveExisting={(idx) => setForm({ ...form, images_3d_preview: form.images_3d_preview.filter((_, i) => i !== idx) })}
              preview={form.images_3d_preview}
              label="Images 3D"
              placeholder="Glissez ou cliquez pour uploader les images 3D"
            />
            <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
