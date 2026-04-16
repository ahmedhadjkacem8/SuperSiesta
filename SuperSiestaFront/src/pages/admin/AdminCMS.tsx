import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import { Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { confirmDelete } from "@/lib/swal";

interface ContentBlock {
  id: string;
  key: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  section: string | null;
  page: string | null;
  updated_at: string;
}

interface FormState {
  title: string;
  content: string;
  image_file: File | null;
  image_preview: string;
}

export default function AdminCMS() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [editBlock, setEditBlock] = useState<ContentBlock | null>(null);
  const [form, setForm] = useState<FormState>({ title: "", content: "", image_file: null, image_preview: "" });
  const [filterPage, setFilterPage] = useState("");

  const load = async () => {
    try {
      const data = await api.get<ContentBlock[]>("/site-content");
      setBlocks(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement du contenu");
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (b: ContentBlock) => {
    setEditBlock(b);
    setForm({ title: b.title || "", content: b.content || "", image_file: null, image_preview: b.image_url || "" });
  };

  const handleSave = async () => {
    if (!editBlock) return;
    try {
      const formData = new FormData();
      formData.append("title", form.title || "");
      formData.append("content", form.content || "");
      if (form.image_file) {
        formData.append("image_url", form.image_file);
      }
      
      formData.append("_method", "PUT");
      await api.post(`/site-content/${editBlock.id}`, formData);
      toast.success("Contenu mis à jour");
      setEditBlock(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  };

  const handleAddBlock = async () => {
    const key = prompt("Clé unique du bloc (ex: promo_summer)");
    if (!key) return;
    try {
      await api.post("/site-content", {
        key,
        page: "home",
        section: "custom",
      });
      toast.success("Bloc créé");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce bloc ?", "Le contenu n'apparaîtra plus sur le site."))) return;
    try {
      await api.delete(`/site-content/${id}`);
      toast.success("Bloc supprimé");
      load();
    } catch (err: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const pages = [...new Set(blocks.map((b) => b.page || "other"))];
  const filtered = filterPage ? blocks.filter((b) => b.page === filterPage) : blocks;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">CMS Contenu</h1>
        <Button size="sm" onClick={handleAddBlock}>+ Nouveau bloc</Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Modifiez les textes, titres et images affichés sur le site. Les changements sont immédiats.
      </p>

      {/* Page filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterPage("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            !filterPage ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
          }`}
        >Tous</button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setFilterPage(filterPage === p ? "" : p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
              filterPage === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
            }`}
          >{p}</button>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clé</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Contenu (aperçu)</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun bloc</TableCell></TableRow>
            )}
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.key}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{b.page}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">{b.section}</TableCell>
                <TableCell className="text-sm font-medium">{b.title || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{b.content || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editBlock} onOpenChange={(v) => { if (!v) setEditBlock(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier — {editBlock?.key}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Contenu</label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} />
            </div>
            <ImageUpload
              value={form.image_file}
              onChange={(file) => setForm({ ...form, image_file: file })}
              preview={form.image_preview}
              label="Image"
              placeholder="Glissez ou cliquez pour uploader l'image"
            />
            <Button onClick={handleSave} className="w-full"><Save className="w-4 h-4 mr-1" /> Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
