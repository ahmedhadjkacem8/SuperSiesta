import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, XCircle, Clock, CheckCircle, Truck, Receipt, Navigation, Loader2, RefreshCw, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { formatPrice } from "@/lib/utils";
import { useOrders, type Order } from "@/hooks/useOrders";
import { AdminCreateOrderDialog } from "@/components/admin/AdminCreateOrderDialog";

// Local Order interface removed, using the one from useOrders

const STATUSES = [
  { value: "en_attente", label: "En attente", icon: Clock, color: "bg-amber-100 text-amber-800" },
  { value: "accepté", label: "Acceptée", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  { value: "annulée", label: "Annulée", icon: XCircle, color: "bg-red-100 text-red-800" },
];

export default function AdminCommandes() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Use optimized hook with admin endpoint
  const { orders, loading, fetchOrders, updateOrderStatus } = useOrders({ adminEndpoint: true });

  const filtered = orders.filter((o) => {
    const matchSearch = !search || 
      o.full_name.toLowerCase().includes(search.toLowerCase()) || 
      o.order_number.toLowerCase().includes(search.toLowerCase()) || 
      o.phone.includes(search) ||
      (o.phone2 && o.phone2.includes(search));
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusInfo = (s: string) => STATUSES.find((st) => st.value === s) || STATUSES[0];

  // Refetch when filter changes or on interval
  useEffect(() => {
    const fetchData = () => {
      if (filterStatus) {
        fetchOrders({ status: filterStatus, adminEndpoint: true });
      } else {
        fetchOrders({ adminEndpoint: true });
      }
    };

    fetchData();
  }, [filterStatus]);

  const viewDetail = (o: Order) => {
    setSelectedOrder(o);
    setDetailDialogOpen(true);
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/invoices/${invoiceId}/preview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });
      
      if (!response.ok) throw new Error('Impossible de télécharger la facture');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Facture téléchargée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléchargement");
    }
  };

  const deleteOrder = async (o: Order) => {
    if (!await confirmDelete(`Supprimer la commande ${o.order_number} ?`, "Cette action est irréversible.")) return;
    try {
      await api.delete(`/orders/${o.id}`);
      toast.success("Commande supprimée");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Commandes</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders({ adminEndpoint: true })}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Créer une commande
          </Button>
          <Badge variant="outline">{orders.length} commande{orders.length > 1 ? "s" : ""}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom, n° ou tél..." 
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
            Tous ({orders.length})
          </button>
          {STATUSES.map((s) => {
            const count = orders.filter(o => o.status === s.value).length;
            return (
              <button 
                key={s.value} 
                onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)} 
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filterStatus === s.value 
                    ? s.color + " border-transparent" 
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">N° Commande</TableHead>
                <TableHead className="font-bold">Client</TableHead>
                <TableHead className="font-bold">Ville</TableHead>
                <TableHead className="font-bold text-right">Total</TableHead>
                <TableHead className="font-bold text-center">Statut</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((o) => {
                const si = getStatusInfo(o.status);
                const StatusIcon = si.icon;
                return (
                  <TableRow key={o.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-mono text-xs font-black text-primary uppercase">
                      #{o.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{o.full_name}</p>
                          {o.user_id ? (
                            <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-blue-50 text-blue-700 border-blue-200">CLIENT</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 text-muted-foreground border-dashed">ANONYME</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {o.phone}
                          {o.phone2 && <span className="ml-1 opacity-70">/ {o.phone2}</span>}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{o.city}</TableCell>
                    <TableCell className="font-black text-sm text-right text-primary">
                      {formatPrice(o.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1">
                        <div className="group relative">
                          <button 
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${si.color} hover:brightness-95`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const currentIndex = STATUSES.findIndex(s => s.value === o.status);
                              const nextIndex = (currentIndex + 1) % (STATUSES.length - 1);
                              const newStatus = STATUSES[nextIndex].value;
                              
                              try {
                                toast.promise(updateOrderStatus(o.id, newStatus), {
                                  loading: 'Mise à jour...',
                                  success: 'Statut mis à jour',
                                  error: 'Erreur lors de la mise à jour'
                                });
                              } catch (err) {}
                            }}
                            title="Cliquer pour changer rapidement de statut"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {si.label}
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => viewDetail(o)} 
                          title="Détails complets"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {/* Invoice button removed as requested */}



                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteOrder(o)} 
                          title="Supprimer"
                        >
                          <XCircle className="w-4 h-4" />
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

      {/* Create Order Dialog */}
      <AdminCreateOrderDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => fetchOrders({ adminEndpoint: true })}
      />

      {/* Detail Dialog with new component */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedOrder(null);
          setDetailDialogOpen(false);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder && `Commande ${selectedOrder.order_number}`}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderDetailPanel 
              orderId={selectedOrder.id}
              onClose={() => setDetailDialogOpen(false)}
              onRefresh={() => fetchOrders({ adminEndpoint: true })}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
