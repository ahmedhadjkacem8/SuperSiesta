import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Search, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { formatPrice } from "@/lib/utils";

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

const TAG_OPTIONS = ["BtoB", "BtoC", "VIP", "Revendeur", "Particulier", "Fidèle"];
const TAG_COLORS: Record<string, string> = {
  BtoB: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  BtoC: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  VIP: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Revendeur: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Particulier: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  Fidèle: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", address: "", city: "", notes: "", tags: [] as string[] });
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [history, setHistory] = useState<{ quotes: any[]; invoices: any[]; orders: any[]; reviews: any[] } | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);

  // B2B account creation
  const [b2bOpen, setB2bOpen] = useState(false);
  const [b2bForm, setB2bForm] = useState({ email: "", password: "", full_name: "", phone: "", company: "" });
  const [b2bCreating, setB2bCreating] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<Client[]>("/clients");
      setClients(data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des clients");
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ full_name: "", email: "", phone: "", address: "", city: "", notes: "", tags: [] }); setEditing(null); };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error("Le nom est requis"); return; }
    const payload = { ...form };
    if (editing) {
      try {
        await api.put(`/clients/${editing.id}`, payload);
        toast.success("Client mis à jour");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la mise à jour");
        return;
      }
    } else {
      try {
        await api.post("/clients", payload);
        toast.success("Client ajouté");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'ajout");
        return;
      }
    }
    setOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce client ?", "L'historique et les données de contact seront perdus."))) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success("Client supprimé"); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ full_name: c.full_name, email: c.email || "", phone: c.phone || "", address: c.address || "", city: c.city || "", notes: c.notes || "", tags: c.tags || [] });
    setOpen(true);
  };

  const toggleTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }));
  };

  const showHistory = async (c: Client) => {
    setHistoryClient(c);
    try {
      const [q, i, o, r] = await Promise.all([
        api.get<any[]>(`/clients/${c.id}/quotes`),
        Promise.resolve([]), // api.get<any[]>(`/clients/${c.id}/invoices`),
        api.get<any[]>(`/clients/${c.id}/orders`),
        api.get<any[]>(`/clients/${c.id}/reviews`),
      ]);
      setHistory({ quotes: q || [], invoices: i || [], orders: o || [], reviews: r || [] });
    } catch (err: any) {
      toast.error("Erreur lors du chargement de l'historique");
    }
  };

  const handleCreateB2B = async () => {
    if (!b2bForm.email || !b2bForm.password || !b2bForm.full_name) { toast.error("Remplissez tous les champs obligatoires"); return; }
    setB2bCreating(true);
    try {
      await api.post("/admin/create-btob", {
        email: b2bForm.email,
        password: b2bForm.password,
        full_name: b2bForm.full_name,
        phone: b2bForm.phone,
        company: b2bForm.company
      });
      toast.success("Compte B2B créé avec succès !");
      setB2bOpen(false);
      setB2bForm({ email: "", password: "", full_name: "", phone: "", company: "" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    }
    setB2bCreating(false);
  };

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search);
    const matchTag = !filterTag || (c.tags || []).includes(filterTag);
    return matchSearch && matchTag;
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Clients (CRM)</h1>
        <div className="flex gap-2">
          <Dialog open={b2bOpen} onOpenChange={setB2bOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary"><ShieldCheck className="w-4 h-4 mr-1" /> Créer compte B2B</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un compte client B2B / Revendeur</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nom complet *" value={b2bForm.full_name} onChange={(e) => setB2bForm({ ...b2bForm, full_name: e.target.value })} />
                <Input placeholder="Nom de l'entreprise" value={b2bForm.company} onChange={(e) => setB2bForm({ ...b2bForm, company: e.target.value })} />
                <Input placeholder="Email *" type="email" value={b2bForm.email} onChange={(e) => setB2bForm({ ...b2bForm, email: e.target.value })} />
                <Input placeholder="Mot de passe *" type="password" value={b2bForm.password} onChange={(e) => setB2bForm({ ...b2bForm, password: e.target.value })} />
                <Input placeholder="Téléphone" value={b2bForm.phone} onChange={(e) => setB2bForm({ ...b2bForm, phone: e.target.value })} />
                <p className="text-xs text-muted-foreground">Ce compte aura accès aux prix revendeur (BtoB) sur la boutique.</p>
                <Button onClick={handleCreateB2B} disabled={b2bCreating} className="w-full">
                  {b2bCreating ? "Création..." : "Créer le compte B2B"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nom complet *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <div>
                  <p className="text-sm font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${form.tags.includes(tag) ? TAG_COLORS[tag] + " border-transparent ring-2 ring-primary/30" : "bg-muted text-muted-foreground border-border hover:bg-accent"}`}>{tag}</button>
                    ))}
                  </div>
                </div>
                <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Ajouter"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {TAG_OPTIONS.map((tag) => (
            <button key={tag} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${filterTag === tag ? TAG_COLORS[tag] + " border-transparent" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"}`}>{tag}</button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun client</TableCell></TableRow>}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium"><button onClick={() => showHistory(c)} className="hover:underline text-left">{c.full_name}</button></TableCell>
                <TableCell className="text-sm">{c.email || "—"}</TableCell>
                <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                <TableCell className="text-sm">{c.city || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(c.tags || []).map((tag) => (<span key={tag} className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${TAG_COLORS[tag] || "bg-muted text-muted-foreground"}`}>{tag}</span>))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* History Dialog */}
      <Dialog open={!!historyClient} onOpenChange={(v) => { if (!v) { setHistoryClient(null); setHistory(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique — {historyClient?.full_name}</DialogTitle>
            <DialogDescription className="sr-only">Historique des commandes, devis et factures du client.</DialogDescription>
          </DialogHeader>
          {history && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Commandes ({history.orders.length})</h3>
                {history.orders.length === 0 ? <p className="text-sm text-muted-foreground">Aucune commande</p> : (
                  <div className="space-y-1">
                    {history.orders.map((o: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                        <span className="font-mono">{o.order_number}</span>
                        <Badge variant="outline" className="capitalize text-xs">{o.status}</Badge>
                        <span className="font-medium">{formatPrice(o.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Devis ({history.quotes.length})</h3>
                {history.quotes.length === 0 ? <p className="text-sm text-muted-foreground">Aucun devis</p> : (
                  <div className="space-y-1">
                    {history.quotes.map((q: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                        <span className="font-mono">{q.quote_number}</span>
                        <Badge variant="outline" className="capitalize text-xs">{q.status}</Badge>
                        <span className="font-medium">{formatPrice(q.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* <div>
                <h3 className="font-semibold text-sm mb-2">Factures ({history.invoices.length})</h3>
                {history.invoices.length === 0 ? <p className="text-sm text-muted-foreground">Aucune facture</p> : (
                  <div className="space-y-1">
                    {history.invoices.map((inv: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                        <span className="font-mono">{inv.invoice_number}</span>
                        <Badge variant="outline" className="capitalize text-xs">{inv.status}</Badge>
                        <span className="font-medium">{formatPrice(inv.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div> */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Avis & Témoignages ({history.reviews.length})</h3>
                {history.reviews.length === 0 ? <p className="text-sm text-muted-foreground">Aucun avis laissé</p> : (
                  <div className="space-y-2">
                    {history.reviews.map((r: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs italic text-foreground/80 line-clamp-3">"{r.message}"</p>
                        {r.is_published && <Badge className="mt-2 text-[9px] h-4 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Publié sur Index</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
