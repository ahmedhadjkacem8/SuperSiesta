import { useState } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/ImageUpload";
import { Plus, Trash2, Edit, Eye, EyeOff, Loader2, X, Star, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { confirmDelete } from "@/lib/swal";
import { Badge } from "@/components/ui/badge";
import { useBlogPosts, useBlogActions, BlogPost } from "@/hooks/useBlog";

interface BlogFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_file: File | null;
  image_preview: string;
  category: string;
  tags: string[];
  published: boolean;
  is_favorite: boolean;
  sort_order: number;
}

export default function AdminBlog() {
  const { data: posts = [], isLoading } = useBlogPosts();
  const blogActions = useBlogActions();

  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogFormState>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    image_file: null,
    image_preview: "",
    category: "blog",
    tags: [],
    published: false,
    is_favorite: false,
    sort_order: 0,
  });
  const [tagInput, setTagInput] = useState("");

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      image_file: null,
      image_preview: "",
      category: "blog",
      tags: [],
      published: false,
      is_favorite: false,
      sort_order: 0,
    });
    setTagInput("");
    setEditing(null);
  };

  const handleEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || "",
      content: p.content || "",
      image_file: null,
      image_preview: p.image_url || "",
      category: p.category,
      tags: p.tags || [],
      published: p.published,
      is_favorite: p.is_favorite || false,
      sort_order: p.sort_order || 0,
    });
  };

  const handleSave = async () => {
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("slug", slug);
    formData.append("excerpt", form.excerpt || "");
    formData.append("content", form.content || "");
    if (form.image_file) {
      formData.append("image_url", form.image_file);
    }
    formData.append("category", form.category);
    (form.tags || []).forEach(t => formData.append("tags[]", t));
    formData.append("published", form.published ? "1" : "0");
    formData.append("is_favorite", form.is_favorite ? "1" : "0");
    formData.append("sort_order", form.sort_order.toString());

    try {
      await blogActions.mutateAsync({
        id: editing?.id,
        data: formData
      });
      toast.success(editing ? "Article mis à jour" : "Article créé");
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    if (blogActions.isPending) return;
    
    const idx = posts.findIndex(p => p.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= posts.length) return;
    
    const a = posts[idx];
    const b = posts[swapIdx];

    try {
      // Swapping sort_orders
      // If they have the same order or 0, we assign them sequential orders based on index
      let orderA = b.sort_order;
      let orderB = a.sort_order;

      if (orderA === orderB) {
        orderA = idx + dir;
        orderB = idx;
      }

      await Promise.all([
        blogActions.mutateAsync({ id: a.id, data: { sort_order: orderA } }),
        blogActions.mutateAsync({ id: b.id, data: { sort_order: orderB } })
      ]);
      
      toast.success("Position mise à jour");
    } catch (err: any) {
      toast.error("Erreur lors du déplacement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cet article ?", "L'article sera définitivement retiré du blog."))) return;
    try {
      await blogActions.mutateAsync({ id, method: 'DELETE' });
      toast.success("Supprimé");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const togglePublish = async (p: BlogPost) => {
    const newPublished = !p.published;
    try {
      await blogActions.mutateAsync({
        id: p.id,
        data: { 
          published: newPublished, 
          published_at: newPublished ? new Date().toISOString() : null 
        }
      });
      toast.success(newPublished ? "Article publié" : "Article dépublié");
    } catch (err: any) {
      toast.error("Erreur lors de la modification");
    }
  };

  const toggleFavorite = async (p: BlogPost) => {
    const newFavorite = !p.is_favorite;
    try {
      await blogActions.mutateAsync({
        id: p.id,
        data: { is_favorite: newFavorite }
      });
      toast.success(newFavorite ? "Ajouté aux favoris" : "Retiré des favoris");
    } catch (err: any) {
      toast.error("Erreur lors de la modification");
    }
  };

  const addTag = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    
    const val = tagInput.trim();
    if (val && !form.tags.includes(val)) {
      setForm({ ...form, tags: [...form.tags, val] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-black mb-6">Blog & Conseils</h1>

      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <h2 className="font-bold mb-4">{editing ? "Modifier l'article" : "Nouvel article"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre" className="px-4 py-2.5 border border-border rounded-xl bg-background text-sm" />
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Slug (auto)" className="px-4 py-2.5 border border-border rounded-xl bg-background text-sm" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-4 py-2.5 border border-border rounded-xl bg-background text-sm">
            <option value="blog">Actualité</option>
            <option value="conseil">Conseil</option>
          </select>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input 
                value={tagInput} 
                onChange={(e) => setTagInput(e.target.value)} 
                onKeyDown={addTag}
                placeholder="Ajouter un tag... (Entrée)" 
                className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-background text-sm" 
              />
              <button 
                type="button" 
                onClick={() => addTag()}
                className="px-4 bg-muted hover:bg-accent rounded-xl text-sm transition-colors"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {form.tags.length > 0 ? form.tags.map((t) => (
                <Badge key={t} variant="secondary" className="pl-3 pr-1 py-1 gap-1 group">
                  {t}
                  <button 
                    onClick={() => removeTag(t)}
                    className="p-0.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground group-hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )) : (
                <span className="text-xs text-muted-foreground italic mt-1">Aucun tag</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <ImageUpload
              value={form.image_file}
              onChange={(file) => setForm({ ...form, image_file: file })}
              folder="blog"
              label="Image de l'article"
              placeholder="Glissez ou cliquez pour uploader l'image"
              preview={form.image_preview}
            />
          </div>
          <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Résumé" rows={2} className="px-4 py-2.5 border border-border rounded-xl bg-background text-sm md:col-span-2 resize-none" />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Contenu (Markdown)" rows={8} className="px-4 py-2.5 border border-border rounded-xl bg-background text-sm md:col-span-2 resize-none font-mono" />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> 
            Publié
          </label>
          <label className="flex items-center gap-2 text-sm text-yellow-600 font-bold">
            <input type="checkbox" checked={form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} /> 
            Favori (Mettre en avant)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm">Ordre :</span>
            <input 
              type="number" 
              value={form.sort_order} 
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} 
              className="w-20 px-3 py-1 border border-border rounded-lg bg-background text-sm" 
            />
          </div>
          <button 
            onClick={handleSave} 
            disabled={blogActions.isPending}
            className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {blogActions.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Mettre à jour" : "Créer")}
          </button>
          {editing && <button onClick={resetForm} className="text-sm text-muted-foreground hover:underline">Annuler</button>}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {posts.map((p, i) => (
            <motion.div 
              layout
              key={p.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 50, mass: 1 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 justify-between shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.category === "conseil" ? "bg-accent text-accent-foreground" : "bg-secondary/10 text-secondary"}`}>{p.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{p.published ? "Publié" : "Brouillon"}</span>
                  {p.is_favorite && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500 text-white flex items-center gap-1">★ Favori</span>}
                </div>
                <p className="font-bold line-clamp-1">{p.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{p.slug} • Ordre: {p.sort_order}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                  onClick={() => move(p.id, -1)} 
                  disabled={i === 0 || blogActions.isPending} 
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
                  title="Monter"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => move(p.id, 1)} 
                  disabled={i === posts.length - 1 || blogActions.isPending} 
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
                  title="Descendre"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleFavorite(p)} 
                  disabled={blogActions.isPending}
                  className={`p-2 rounded-lg hover:bg-muted ${p.is_favorite ? "text-yellow-500" : "text-muted-foreground"}`}
                  title={p.is_favorite ? "Retirer des favoris" : "Marquer comme favori"}
                >
                  <Star className={`w-4 h-4 ${p.is_favorite ? "fill-yellow-500" : ""}`} />
                </button>
                <button onClick={() => togglePublish(p)} disabled={blogActions.isPending} className="p-2 rounded-lg hover:bg-muted" title={p.published ? "Dépublier" : "Publier"}>
                  {p.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(p)} disabled={blogActions.isPending} className="p-2 rounded-lg hover:bg-muted"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} disabled={blogActions.isPending} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
