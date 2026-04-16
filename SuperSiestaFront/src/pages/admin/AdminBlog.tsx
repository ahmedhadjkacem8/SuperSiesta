import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/ImageUpload";
import { Plus, Trash2, Edit, Eye, EyeOff, Loader2, X, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { Badge } from "@/components/ui/badge";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  published: boolean;
  is_favorite: boolean;
  published_at: string | null;
  created_at: string;
}

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
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
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
  });
  const [tagInput, setTagInput] = useState("");

  const fetchPosts = async () => {
    try {
      const data = await api.get<BlogPost[]>("/blog-posts");
      setPosts(data || []);
      setLoading(false);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des articles");
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

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

    if (editing) {
      try {
        formData.append("_method", "PUT");
        await api.post(`/blog-posts/${editing.id}`, formData);
        toast.success("Article mis à jour");
        resetForm();
        fetchPosts();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la mise à jour");
      }
    } else {
      try {
        await api.post("/blog-posts", formData);
        toast.success("Article créé");
        resetForm();
        fetchPosts();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la création");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cet article ?", "L'article sera définitivement retiré du blog."))) return;
    try {
      await api.delete(`/blog-posts/${id}`);
      toast.success("Supprimé");
      fetchPosts();
    } catch (err: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const togglePublish = async (p: BlogPost) => {
    const newPublished = !p.published;
    
    // Optimistic update
    setPosts(posts.map(post => 
      post.id === p.id ? { ...post, published: newPublished } : post
    ));

    try {
      await api.put(`/blog-posts/${p.id}`, { 
        published: newPublished, 
        published_at: newPublished ? new Date().toISOString() : null 
      });
      toast.success(newPublished ? "Article publié" : "Article dépublié");
    } catch (err: any) {
      // Rollback on error
      setPosts(posts.map(post => 
        post.id === p.id ? { ...post, published: p.published } : post
      ));
      toast.error("Erreur lors de la modification");
      fetchPosts();
    }
  };

  const toggleFavorite = async (p: BlogPost) => {
    const newFavorite = !p.is_favorite;
    
    // Optimistic update
    setPosts(posts.map(post => 
      post.id === p.id ? { ...post, is_favorite: newFavorite } : post
    ));

    try {
      await api.put(`/blog-posts/${p.id}`, { is_favorite: newFavorite });
      toast.success(newFavorite ? "Ajouté aux favoris" : "Retiré des favoris");
    } catch (err: any) {
      // Rollback on error
      setPosts(posts.map(post => 
        post.id === p.id ? { ...post, is_favorite: p.is_favorite } : post
      ));
      toast.error("Erreur lors de la modification");
      fetchPosts();
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
          <button onClick={handleSave} className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-xl text-sm hover:bg-primary/90"><Plus className="w-4 h-4 inline mr-1" />{editing ? "Mettre à jour" : "Créer"}</button>
          {editing && <button onClick={resetForm} className="text-sm text-muted-foreground hover:underline">Annuler</button>}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.category === "conseil" ? "bg-accent text-accent-foreground" : "bg-secondary/10 text-secondary"}`}>{p.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{p.published ? "Publié" : "Brouillon"}</span>
                  {p.is_favorite && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500 text-white flex items-center gap-1">★ Favori</span>}
                </div>
                <p className="font-bold">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.slug}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleFavorite(p)} 
                  className={`p-2 rounded-lg hover:bg-muted ${p.is_favorite ? "text-yellow-500" : "text-muted-foreground"}`}
                  title={p.is_favorite ? "Retirer des favoris" : "Marquer comme favori"}
                >
                  <Star className={`w-4 h-4 ${p.is_favorite ? "fill-yellow-500" : ""}`} />
                </button>
                <button onClick={() => togglePublish(p)} className="p-2 rounded-lg hover:bg-muted" title={p.published ? "Dépublier" : "Publier"}>
                  {p.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-muted"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
