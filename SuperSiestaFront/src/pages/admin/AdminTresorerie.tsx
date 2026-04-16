import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { formatPrice } from "@/lib/utils";

interface TreasuryEntry {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  reference: string | null;
  entry_date: string;
  created_at: string;
}

const categories = ["Vente matelas", "Livraison", "Salaires", "Loyer", "Fournitures", "Marketing", "Autre"];

export default function AdminTresorerie() {
  const [entries, setEntries] = useState<TreasuryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "entrée", category: "", amount: "", description: "", reference: "", entry_date: new Date().toISOString().split("T")[0] });

  const load = async () => {
    try {
      const data = await api.get<TreasuryEntry[]>("/treasury-entries");
      setEntries(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ type: "entrée", category: "", amount: "", description: "", reference: "", entry_date: new Date().toISOString().split("T")[0] });

  const handleSave = async () => {
    if (!form.category || !form.amount) { toast.error("Catégorie et montant requis"); return; }
    try {
      await api.post("/treasury-entries", {
        type: form.type,
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || null,
        reference: form.reference || null,
        entry_date: form.entry_date,
      });
      toast.success("Entrée ajoutée");
      setOpen(false); resetForm(); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cette entrée ?", "Le solde sera recalculé sans cette opération."))) return;
    try {
      await api.delete(`/treasury-entries/${id}`);
      toast.success("Supprimé"); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const totalIn = entries.filter((e) => e.type === "entrée").reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = entries.filter((e) => e.type === "sortie").reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIn - totalOut;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trésorerie</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nouvelle entrée</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle entrée</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrée">Entrée</SelectItem>
                  <SelectItem value="sortie">Sortie</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Montant (TND)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Référence" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
              <Button onClick={handleSave} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Entrées</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-xl font-bold text-primary">{formatPrice(totalIn)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Sorties</CardTitle>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-xl font-bold text-destructive">{formatPrice(totalOut)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Solde</CardTitle></CardHeader>
          <CardContent><p className={`text-xl font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>{formatPrice(balance)}</p></CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16">-</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune entrée</TableCell></TableRow>}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{new Date(e.entry_date).toLocaleDateString("fr-TN")}</TableCell>
                <TableCell>
                  <Badge variant={e.type === "entrée" ? "default" : "destructive"}>{e.type}</Badge>
                </TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell className="font-medium">{formatPrice(e.amount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.description}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
