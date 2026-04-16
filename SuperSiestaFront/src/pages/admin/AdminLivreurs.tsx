import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";

export interface DeliveryMan {
  id: string;
  name: string;
  phone: string | null;
  vehicle: string | null;
  is_active: boolean;
}

export default function AdminLivreurs() {
  const [livreurs, setLivreurs] = useState<DeliveryMan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryMan | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", vehicle: "", is_active: true });

  const load = async () => {
    try {
      const data = await api.get<DeliveryMan[]>("/delivery-men");
      setLivreurs(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des livreurs");
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    try {
      if (editing) {
        await api.put(`/delivery-men/${editing.id}`, form);
        toast.success("Livreur mis à jour");
      } else {
        await api.post("/delivery-men", form);
        toast.success("Livreur ajouté");
      }
      setOpen(false);
      setForm({ name: "", phone: "", vehicle: "", is_active: true });
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur d'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce livreur ?", "Impossible d'annuler."))) return;
    try {
      await api.delete(`/delivery-men/${id}`);
      toast.success("Livreur supprimé");
      load();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Livreurs</h1>
          <p className="text-sm text-muted-foreground">Gérez vos livreurs</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { 
          setOpen(v); 
          if (!v) { setEditing(null); setForm({ name: "", phone: "", vehicle: "", is_active: true }); } 
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter Un Livreur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier livreur" : "Ajouter un livreur"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom complet</label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Téléphone</label>
                <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Véhicule (Optionnel)</label>
                <Input dir="auto" placeholder="Ex: 1234 تونس 123" value={form.vehicle} onChange={(e) => setForm({...form, vehicle: e.target.value})} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({...form, is_active: v})} />
                <label className="text-sm font-medium">Actif (disponible pour les BL)</label>
              </div>
              <Button onClick={handleSave} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {livreurs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.phone || "-"}</TableCell>
                <TableCell>{l.vehicle || "-"}</TableCell>
                <TableCell>
                  {l.is_active ? <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">Actif</span> : <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold">Inactif</span>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(l); setForm({ name: l.name, phone: l.phone || "", vehicle: l.vehicle || "", is_active: l.is_active }); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {livreurs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4">Aucun livreur</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
