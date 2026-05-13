import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, XCircle, Clock, CheckCircle, User, Loader2, RefreshCw, Package, Phone, Mail, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { formatPrice } from "@/lib/utils";

interface Prospect {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  city: string;
  notes: string;
  cart_items: any[];
  total: number;
  status: string;
  created_at: string;
}

const STATUSES = [
  { value: "nouveau", label: "Nouveau", icon: Clock, color: "bg-blue-100 text-blue-800" },
  { value: "contacté", label: "Contacté", icon: Phone, color: "bg-amber-100 text-amber-800" },
  { value: "converti", label: "Converti", icon: CheckCircle, color: "bg-emerald-100 text-emerald-800" },
  { value: "abandonné", label: "Abandonné", icon: XCircle, color: "bg-red-100 text-red-800" },
];

export default function AdminProspects() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchProspects = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      
      const res = await api.get<any>("/prospects", { params });
      if (res) {
        const newData = Array.isArray(res) ? res : (res.data || []);
        
        // Detect new prospects for notification
        if (silent && newData.length > prospects.length) {
          const latest = newData[0];
          // Simple check: if the first one is different from our first one
          if (prospects.length > 0 && latest.id !== prospects[0].id) {
            toast.success(`Nouveau prospect : ${latest.full_name || 'Anonyme'}`, {
              description: `Panier de ${formatPrice(latest.total)}`,
              icon: <Package className="w-4 h-4" />,
            });
            // Try to play a subtle sound if possible or just rely on toast
          }
        }
        
        setProspects(newData);
      }
    } catch (err: any) {
      if (!silent) toast.error("Erreur lors de la récupération des prospects");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchProspects(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [filterStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) fetchProspects();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const getStatusInfo = (s: string) => STATUSES.find((st) => st.value === s) || STATUSES[0];

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/prospects/${id}`, { status: newStatus });
      setProspects(prospects.map(p => p.id === id ? { ...p, status: newStatus } : p));
      if (selectedProspect?.id === id) setSelectedProspect({ ...selectedProspect, status: newStatus });
      toast.success("Statut mis à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteProspect = async (id: string) => {
    if (!await confirmDelete("Supprimer ce prospect ?", "Cette action est irréversible.")) return;
    try {
      await api.delete(`/prospects/${id}`);
      setProspects(prospects.filter(p => p.id !== id));
      toast.success("Prospect supprimé");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const viewDetail = (p: Prospect) => {
    setSelectedProspect(p);
    setDetailDialogOpen(true);
  };

  const filtered = prospects; // Backend handles filtering now

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prospects (Paniers abandonnés)</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProspects}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Badge variant="outline">{prospects.length} prospect{prospects.length > 1 ? "s" : ""}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom, email ou tél..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button 
            onClick={() => setFilterStatus("")} 
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !filterStatus ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            Tous
          </button>
          {STATUSES.map((s) => (
            <button 
              key={s.value} 
              onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)} 
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filterStatus === s.value 
                  ? s.color + " border-transparent" 
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Client</TableHead>
                <TableHead className="font-bold">Contact</TableHead>
                <TableHead className="font-bold">Ville</TableHead>
                <TableHead className="font-bold text-right">Montant Panier</TableHead>
                <TableHead className="font-bold text-center">Statut</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    Aucun prospect trouvé
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => {
                const si = getStatusInfo(p.status);
                const StatusIcon = si.icon;
                return (
                  <TableRow key={p.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-sm">{p.full_name || "Anonyme"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {p.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {p.phone}</div>}
                        {p.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" /> {p.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{p.city || "—"}</TableCell>
                    <TableCell className="font-black text-sm text-right text-primary">
                      {formatPrice(p.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`uppercase text-[9px] font-black ${si.color} border-none`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-1" />
                        {si.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => viewDetail(p)} 
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteProspect(p.id)} 
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Détails du Prospect
            </DialogTitle>
          </DialogHeader>
          
          {selectedProspect && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Informations Client</p>
                    <p className="font-bold text-lg">{selectedProspect.full_name || "Nom non renseigné"}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {selectedProspect.phone || "—"}</p>
                      {selectedProspect.phone2 && <p className="text-sm flex items-center gap-2 text-muted-foreground ml-5">{selectedProspect.phone2}</p>}
                      <p className="text-sm flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {selectedProspect.email || "—"}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Adresse</p>
                    <div className="text-sm text-muted-foreground flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{selectedProspect.city || "Ville non renseignée"}</p>
                        <p>{selectedProspect.address || "Adresse non renseignée"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Statut & Suivi</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => updateStatus(selectedProspect.id, s.value)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                            selectedProspect.status === s.value 
                              ? s.color + " border-transparent shadow-sm" 
                              : "bg-background text-muted-foreground border-border hover:border-primary/30"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedProspect.notes && (
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Notes Client</p>
                      <div className="bg-muted/50 p-3 rounded-xl border border-border text-sm italic">
                        "{selectedProspect.notes}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Contenu du Panier</p>
                <div className="bg-muted/30 rounded-2xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-10 text-[10px] font-black uppercase">Produit</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase">Détails</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase text-center">Qté</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase text-right">Prix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProspect.cart_items && selectedProspect.cart_items.map((item: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="font-bold text-sm py-2">{item.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">{item.size}</TableCell>
                          <TableCell className="text-center py-2">{item.quantity}</TableCell>
                          <TableCell className="text-right font-bold py-2">{formatPrice(item.price * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/20 hover:bg-transparent">
                        <TableCell colSpan={3} className="font-black text-right uppercase text-xs">Total Estimé</TableCell>
                        <TableCell className="text-right font-black text-primary text-base">{formatPrice(selectedProspect.total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
                <Button onClick={() => window.open(`tel:${selectedProspect.phone}`)} className="gap-2">
                  <Phone className="w-4 h-4" />
                  Appeler le prospect
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
