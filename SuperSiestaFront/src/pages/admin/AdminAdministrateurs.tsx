import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  created_at?: string;
}

export default function AdminAdministrateurs() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      // Trying /admins endpoint
      const data = await api.get<AdminUser[]>("/admins");
      setAdmins(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des administrateurs");
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ full_name: "", email: "", password: "" });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Le nom et l'email sont requis");
      return;
    }
    
    if (!editing && !form.password) {
      toast.error("Le mot de passe est requis pour un nouveau compte");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { full_name: form.full_name, email: form.email };
      if (form.password) {
        payload.password = form.password;
      }

      if (editing) {
        await api.put(`/admins/${editing.id}`, payload);
        toast.success("Administrateur mis à jour");
      } else {
        await api.post("/admins", payload);
        toast.success("Administrateur ajouté");
      }
      setOpen(false);
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cet administrateur ?", "Cette action est irréversible."))) return;
    try {
      await api.delete(`/admins/${id}`);
      toast.success("Administrateur supprimé");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const openEdit = (admin: AdminUser) => {
    setEditing(admin);
    setForm({ full_name: admin.full_name, email: admin.email, password: "" });
    setOpen(true);
  };

  const filtered = admins.filter((a) => {
    return !search || 
      a.full_name.toLowerCase().includes(search.toLowerCase()) || 
      a.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Administrateurs
        </h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'administrateur" : "Nouvel administrateur"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                placeholder="Nom complet *" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              />
              <Input 
                placeholder="Email *" 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
              <Input 
                placeholder={editing ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"} 
                type="password" 
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
              />
              <Button onClick={handleSave} className="w-full" disabled={loading}>
                {loading ? "Chargement..." : editing ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Aucun administrateur trouvé
                </TableCell>
              </TableRow>
            )}
            {filtered.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">{admin.full_name}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(admin.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
