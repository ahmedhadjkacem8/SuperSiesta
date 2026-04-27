import React, { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Printer, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { OrderProgressBar } from '@/components/common/OrderProgressBar';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  order_id: string | null;
  client_id: string | null;
  status: string;
  delivery_address: string | null;
  delivery_city: string | null;
  full_name: string;
  phone: string | null;
  notes: string | null;
  delivered_at: string | null;
  delivery_man_id?: string | null;
  delivery_man_name?: string | null;
  created_at: string;
  order?: { order_number: string } | null;
  delivery_man?: {
    id: string;
    name: string;
    phone?: string | null;
    vehicle?: string | null;
  } | null;
}

interface GiftItem {
  id: string;
  titre: string;
  description?: string | null;
  image?: string | null;
  poids?: number;
}

interface DeliveryItem {
  id: string;
  product_name: string;
  product_image: string | null;
  size_label: string;
  grammage?: string | null;
  quantity: number;
  delivered_quantity: number;
  unit_price?: number;
  gifts_grammage?: Record<string, string> | null;
  product?: {
    id: string;
    gamme?: string | null;
    free_gifts?: GiftItem[];
  } | null;
}

const STATUSES = [
  { value: "preparation", label: "Préparation", color: "bg-amber-100 text-amber-800" },
  { value: "en_livraison", label: "En livraison", color: "bg-indigo-100 text-indigo-800" },
  { value: "livrée", label: "Livrée", color: "bg-green-100 text-green-800" },
  { value: "annulée", label: "Annulée", color: "bg-red-100 text-red-800" },
];

export default function AdminBonLivraison() {
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [detail, setDetail] = useState<DeliveryNote | null>(null);
  const [detailItems, setDetailItems] = useState<DeliveryItem[]>([]);
  const [livreurs, setLivreurs] = useState<{ id: string, name: string, is_active: boolean }[]>([]);
  const [selectedLivreurId, setSelectedLivreurId] = useState<string>("");
  const [customLivreurName, setCustomLivreurName] = useState<string>("");
  const [customLivreurPhone, setCustomLivreurPhone] = useState<string>("");
  const [customLivreurVehicle, setCustomLivreurVehicle] = useState<string>("");
  const [gammes, setGammes] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      // Add timestamp to bypass potential browser/network caching (Issue: Instant Sync)
      const timestamp = Date.now();
      const [notesData, livreursData, gammesData, dimensionsData] = await Promise.all([
        api.get<DeliveryNote[]>(`/delivery-notes?t=${timestamp}`),
        api.get<{ id: string, name: string, is_active: boolean }[]>(`/delivery-men?t=${timestamp}`),
        api.get<any[]>(`/gammes?t=${timestamp}`),
        api.get<any[]>(`/dimensions?t=${timestamp}`)
      ]);
      setNotes(notesData || []);
      setLivreurs(livreursData || []);
      setGammes(Array.isArray(gammesData) ? gammesData : (gammesData as any).data || []);
      setDimensions(Array.isArray(dimensionsData) ? dimensionsData : (dimensionsData as any).data || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const viewDetail = async (dn: DeliveryNote) => {
    setDetail(dn);
    setSelectedLivreurId(dn.delivery_man_id || "custom");
    setCustomLivreurName(dn.delivery_man_name || "");
    setCustomLivreurPhone("");
    setCustomLivreurVehicle("");
    try {
      const [data, orderItems, orderData] = await Promise.all([
        api.get<DeliveryItem[]>(`/delivery-notes/${dn.id}/items`),
        dn.order_id ? api.get<any[]>(`/orders/${dn.order_id}/items`) : Promise.resolve([]),
        dn.order_id ? api.get<any>(`/orders/${dn.order_id}`) : Promise.resolve(null)
      ]);
      
      // Store order total for printing
      if (orderData) {
        setDetail((prev: any) => ({ ...prev, order_total: orderData.total }));
      }

      // Match prices from order items to delivery items
      const enrichedData = data.map(di => {
        const oi = orderItems.find(o => 
          o.product_name === di.product_name && o.size_label === di.size_label
        );
        return { ...di, unit_price: oi ? (oi.unit_price || oi.price) : undefined };
      });

      setDetailItems(enrichedData || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des articles");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/delivery-notes/${id}/status`, { status });
      toast.success("Statut mis à jour");
      load();
      if (detail?.id === id) setDetail({ ...detail!, status });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  };

  const updateDeliveredQty = async (itemId: string, qty: number) => {
    try {
      await api.put(`/delivery-note-items/${itemId}`, { delivered_quantity: qty });
      setDetailItems(prev => prev.map(it => it.id === itemId ? { ...it, delivered_quantity: qty } : it));
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour de la quantité");
    }
  };

  const updateGiftGrammage = async (itemId: string, giftId: string, grammage: string) => {
    try {
      const item = detailItems.find(it => it.id === itemId);
      if (!item) return;
      const newGiftsGrammage = { ...(item.gifts_grammage || {}), [giftId]: grammage };
      await api.put(`/delivery-note-items/${itemId}`, { gifts_grammage: newGiftsGrammage });
      setDetailItems(prev => prev.map(it => it.id === itemId ? { ...it, gifts_grammage: newGiftsGrammage } : it));
    } catch (err: any) {
      // Don't show toast for every character typed, maybe debounce? But user said "enregistré"
      // For now let's just do it on blur or just do it and hope it's fast enough
    }
  };

  const saveLivreur = async () => {
    if (!detail) return;
    try {
      let finalLivreurId = selectedLivreurId;
      let finalLivreurName = null;

      if (selectedLivreurId === "custom") {
        if (!customLivreurName.trim()) {
          toast.error("Nom du livreur requis");
          return;
        }
        const newDm = await api.post<{ id: string, name: string }>("/delivery-men", {
          name: customLivreurName,
          phone: customLivreurPhone,
          vehicle: customLivreurVehicle,
          is_active: true
        });
        finalLivreurId = newDm?.id || "custom";
        if (finalLivreurId === "custom") {
          finalLivreurName = customLivreurName;
        }
      }

      const payload = {
        delivery_man_id: finalLivreurId === "custom" ? null : finalLivreurId,
        delivery_man_name: finalLivreurId === "custom" ? finalLivreurName : null
      };

      await api.put(`/delivery-notes/${detail.id}`, payload);
      toast.success("Livreur assigné");

      // Refetch full data to ensure delivery_man object is populated for printing (Issue 2)
      const updatedNotes = await api.get<DeliveryNote[]>("/delivery-notes");
      setNotes(updatedNotes || []);
      const updatedNote = updatedNotes.find(n => n.id === detail.id);
      if (updatedNote) setDetail(updatedNote);
    } catch (err: any) {
      toast.error("Erreur de mise à jour");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer ce bon de livraison ?", "Cette action n'affecte pas la commande liée mais supprime le BL."))) return;
    try {
      await api.delete(`/delivery-notes/${id}`);
      toast.success("Bon supprimé");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content || !detail) return;

    const win = window.open("", "_blank");
    if (!win) return;

    const styleStr = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
      @page { size: A4; margin: 0mm; }
      body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; line-height: 1.5; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .doc-wrapper { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: #fff; position: relative; overflow: hidden; }
      
      /* Header Design */
      .header-container { position: relative; padding: 40px 45px 20px; display: flex; justify-content: space-between; align-items: flex-start; }
      
      .logo-section { z-index: 10; margin-top: -30px; flex: 1; }
      .logo-section img { height: 95px; object-fit: contain; }
      .logo-subtitle { 
        font-size: 14px; 
        font-weight: 500; 
        color: #1d2972; 
        margin-left: 30px;
        letter-spacing: 1px; 
      }
      
      .green-stripe {
        position: absolute;
        top: 150px;
        left: -45px;
        width: 80%;
        height: 70px;
        background: #adc80a;
        z-index: 1;
        border-radius: 27px;
        transform: skewX(25deg);
        overflow: hidden;
      }

      .green-stripe-body {
        position: absolute;
        width: 100%;
        height: 100%;
        background: inherit;
        z-index: 1;
      }

      .coin-top-right, .coin-bottom-right {
        position: absolute;
        right: 0;
        width: 40px;
        height: 40px;
        background: #adc80a;
        z-index: 2;
      }
      .coin-top-right { top: 0; border-top-right-radius: 20px; }
      .coin-bottom-right { bottom: 0; border-bottom-right-radius: 20px; }

      .bl-banner { 
        position: relative;
        background: #1d2972; 
        color: #fff; 
        padding: 25px 50px;
        margin-right: -100px;
        text-align: center;
        box-shadow: -20px 15px 0px rgba(0, 0, 0, 0.20);
        z-index: 10;
        min-width: 440px;
        border-radius: 30px;
        transform: skewX(25deg);
      }
      
      .bl-banner-content {
        transform: skewX(-25deg);
      }

      .bl-banner h1 { margin: 0; font-size: 48px; font-weight: 900; letter-spacing: -1.5px; line-height: 1; }
      .bl-banner p { margin: 5px 0 0; font-size: 18px; font-weight: 700; opacity: 0.9; }

      .main-body { position: relative; z-index: 2; padding: 20px 45px; margin-top: 20px; }

      .info-grid {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        gap: 40px;
      }

      .info-column {
        flex: 1;
      }

      .section-title-box {
        background: #1d2972;
        color: #fff;
        padding: 15px 40px;
        text-align: center;
        z-index: 10;
        border-radius: 20px;
        transform: skewX(25deg);
        display: inline-block;
        margin-bottom: 25px;
      }

      .title-livreur {
        margin-left: -75px;
        box-shadow: 10px 10px 0px rgba(0, 0, 0, 0.15);
      }
      .title-client {
        margin-right: -75px;
        box-shadow: -10px 10px 0px rgba(0, 0, 0, 0.15);
      }
      .section-title-box h2 { 
        margin: 0; 
        font-size: 22px; 
        font-weight: 800; 
        transform: skewX(-25deg); 
      }
      
      .client-info, .delivery-info { font-size: 17px; }
      
      .info-row {
        display: flex;
        gap: 15px;
        margin: 8px 0;
        align-items: baseline;
      }

      .delivery-info .info-row { justify-content: flex-start; text-align: left; }
      .client-info .info-row { justify-content: flex-end; text-align: right; }
      
      .client-info p, .delivery-info p { margin: 0; font-weight: 500; color: #334155; }
      .client-info span, .delivery-info span { font-weight: 800; color: #000; }
      
      .info-label { 
        font-size: 11px; 
        color: #64748b; 
        font-weight: 900; 
        text-transform: uppercase;
        min-width: 80px;
      }
      .client-info .info-label { text-align: right; min-width: auto; }
      .delivery-info .info-label { text-align: left; }

      /* Tables */
      .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 12px; overflow: hidden; border: 2px solid #adc80a; }
      .summary-table th { background: #fff; color: #000; text-align: left; padding: 6px 15px; font-size: 12px; font-weight: 900; text-transform: uppercase; border: 2px solid #adc80a; }
      .summary-table td { background: #f7fee7; color: #000; padding: 6px 15px; font-size: 14px; font-weight: 700; border: 2px solid #adc80a; }

      .items-table { width: 100%; border-collapse: collapse; border: 2px solid #adc80a; margin-bottom: 20px; }
      .items-table th { background: #fff; color: #000; text-align: left; padding: 10px 15px; font-size: 12px; font-weight: 900; text-transform: uppercase; border: 2px solid #adc80a; }
      .items-table td { padding: 10px 15px; font-size: 14px; font-weight: 600; border: 2px solid #adc80a; vertical-align: middle; }
      
      .product-row td { padding: 8px 15px !important; }
      .items-table tr.product-row:nth-child(even) { background: #f9fafb; }
      
      .gift-row td { 
        padding: 0 20px 12px 60px; 
        border: 2px solid #adc80a; 
        border-top: none; 
        background: #fff;
      }
      .gift-text { 
        color: #15803d; 
        font-weight: 700; 
        font-size: 12px;
        background: #f0fdf4;
        padding: 5px 15px;
        border-radius: 10px;
        border: 1.5px dashed #86efac;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        text-transform: capitalize;
      }
      .gift-text::before {
        content: "OFFERT";
        background: #16a34a;
        color: #fff;
        font-size: 9px;
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }

      /* Footer Note & Signature */
      .footer-layout {
        margin-top: 30px;
        position: relative;
        padding-bottom: 50px;
      }
      .note-section { 
        width: 100%;
      }
      .note-section h3 { font-size: 16px; font-weight: 900; margin-bottom: 8px; color: #1e293b; text-transform: uppercase; }
      .note-box { 
        border: 2px solid #adc80a; 
        border-radius: 20px; 
        min-height: 100px; 
        min-width: 350px;
        max-width: 75%;
        padding: 10px 20px; 
        background: #fff; 
        font-size: 14px; 
        color: #475569;
        position: relative;
        z-index: 1;
        display: inline-block;
      }

      .signature-section {
        position: absolute;
        bottom: -20px;
        right: -10px;
        width: 400px;
        text-align: center;
        z-index: 10;
        transform: rotate(-3deg);
      }
      .signature-container img {
        width: 100%;
        max-height: 200px;
        object-fit: contain;
      }

      @media print {
        body { margin: 0; padding: 0; }
        .doc-wrapper { box-shadow: none; border: none; }
      }
    `;

    win.document.head.innerHTML = `<title>BL ${detail.delivery_number}</title><style>${styleStr}</style>`;
    win.document.body.innerHTML = content.innerHTML;

    setTimeout(() => {
      win.print();
    }, 250);
  };

  const filtered = notes.filter((n) => {
    const matchSearch = !search || n.full_name.toLowerCase().includes(search.toLowerCase()) || n.delivery_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || n.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusInfo = (s: string) => STATUSES.find(st => st.value === s) || STATUSES[0];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bons de Livraison</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </Button>
          <Badge variant="outline">{notes.length} bon{notes.length > 1 ? "s" : ""}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setFilterStatus("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!filterStatus ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"}`}>Tous</button>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterStatus === s.value ? s.color + " border-transparent" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"}`}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° BL</TableHead>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun bon de livraison</TableCell></TableRow>}
            {filtered.map(n => {
              const si = getStatusInfo(n.status);
              return (
                <TableRow key={n.id}>
                  <TableCell className="font-mono text-sm">{n.delivery_number}</TableCell>
                  <TableCell className="font-mono text-sm">{n.order?.order_number || "—"}</TableCell>
                  <TableCell><p className="font-medium text-sm">{n.full_name}</p></TableCell>
                  <TableCell className="text-sm">{n.delivery_city || "—"}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => {
                        const currentIndex = STATUSES.findIndex(s => s.value === n.status);
                        const nextIndex = (currentIndex + 1) % (STATUSES.length - 1); // Avoid cycling to 'annulée' easily
                        updateStatus(n.id, STATUSES[nextIndex].value);
                      }}
                      className={`px-2 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${si.color} hover:brightness-95`}
                      title="Cliquer pour changer rapidement de statut"
                    >
                      {si.label}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(n)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={v => { if (!v) setDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>BL {detail?.delivery_number}</span>
              <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" /> Imprimer</Button>
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50 text-sm">
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Client & Expédition</p>
                  <p className="font-black text-base">{detail.full_name}</p>
                  <p className="text-muted-foreground">{detail.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Destinations</p>
                  <p className="font-medium">{detail.delivery_address || "—"}</p>
                  <p className="font-bold text-primary">{detail.delivery_city || "—"}</p>
                </div>
                {detail.order && (
                  <div className="col-span-2 pt-2 border-t border-border/40 flex justify-between items-center">
                    <div>
                      <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Commande liée</p>
                      <p className="font-bold font-mono text-primary">{detail.order.order_number}</p>
                    </div>
                    {detail.notes && (
                      <div className="text-right">
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Notes</p>
                        <p className="font-medium italic text-xs">"{detail.notes}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Changer le statut</p>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => updateStatus(detail.id, s.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${detail.status === s.value ? s.color + " border-transparent ring-2 ring-primary/30" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"}`}>{s.label}</button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg border border-border">
                <p className="text-sm font-medium mb-2">Assigner un Livreur</p>
                <div className="flex flex-col gap-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedLivreurId}
                    onChange={e => setSelectedLivreurId(e.target.value)}
                  >
                    <option value="custom">Saisir manuellement</option>
                    {livreurs.filter(l => l.is_active).map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  {selectedLivreurId === "custom" && (
                    <div className="space-y-2 border border-border p-3 rounded-lg bg-background mt-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Nouveau Livreur</p>
                      <div>
                        <label className="text-xs font-medium">Nom complet</label>
                        <Input className="h-8 text-sm" placeholder="Nom du livreur" value={customLivreurName} onChange={e => setCustomLivreurName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Téléphone</label>
                        <Input className="h-8 text-sm" placeholder="Téléphone du livreur" value={customLivreurPhone} onChange={e => setCustomLivreurPhone(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Véhicule (Optionnel)</label>
                        <Input dir="auto" className="h-8 text-sm" placeholder="Ex: 1234 تونس 123" value={customLivreurVehicle} onChange={e => setCustomLivreurVehicle(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <Button size="sm" onClick={saveLivreur}>Enregistrer le livreur</Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Articles ({detailItems.length})</p>
                <div className="space-y-2">
                  {detailItems.map(item => (
                    <div key={item.id} className="rounded-lg bg-muted/50 overflow-hidden">
                      <div className="flex gap-3 p-2 items-center">
                        {item.product_image && <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.size_label && `Taille ${item.size_label} `}
                            {item.grammage && `— Gr: ${item.grammage} `}
                            — Qté: {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Livré:</span>
                          <Input type="number" min={0} max={item.quantity} value={item.delivered_quantity} onChange={e => updateDeliveredQty(item.id, Number(e.target.value))} className="w-16 h-7 text-xs" />
                        </div>
                      </div>
                      {/* Garantie Display in Dialog */}
                      {(() => {
                        const productGammeName = (item as any).product?.gamme;
                        const gamme = gammes.find(g => g.name === productGammeName || g.slug === productGammeName || g.id === productGammeName);
                        if (gamme && gamme.warranty) {
                          return (
                            <div className="mx-2 mb-2 p-2 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2">
                               <div className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded">GARANTIE</div>
                               <span className="text-xs font-bold">Garantie {gamme.warranty} ans</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {item.product?.free_gifts && item.product.free_gifts.length > 0 && (
                        <div className="border-t border-green-100 bg-green-50/40 px-3 py-2 space-y-2">
                          {item.product.free_gifts.map(gift => (
                            <div key={gift.id} className="flex items-center gap-4 text-xs">
                              <div className="flex-1 flex items-center gap-3">
                                {gift.image && <img src={gift.image} alt="" className="w-10 h-10 rounded-md border border-green-200 shadow-sm object-cover" />}
                                <div className="flex flex-col">
                                  <span className="font-bold text-green-900">{gift.titre}</span>
                                  <span className="text-[10px] text-green-600/70 font-medium tracking-wide uppercase">Cadeau Offert</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Input
                                    placeholder="0"
                                    value={item.gifts_grammage?.[gift.id] || gift.poids || ""}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setDetailItems(prev => prev.map(it => it.id === item.id ? { ...it, gifts_grammage: { ...(it.gifts_grammage || {}), [gift.id]: val } } : it));
                                    }}
                                    onBlur={e => updateGiftGrammage(item.id, gift.id, e.target.value)}
                                    className="w-24 h-8 pr-6 text-xs font-bold bg-white border-green-200 focus-visible:ring-green-400 text-right"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-600 font-bold pointer-events-none">g</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <OrderProgressBar currentStatus={detail.status} />
              </div>
            </div>
          )}

          {/* Print template (hidden) */}
          <div className="hidden">
            <div ref={printRef}>
              {detail && (
                <div className="doc-wrapper">
                  <div className="green-stripe">
                    <div className="green-stripe-body"></div>
                    <div className="coin-top-right"></div>
                    <div className="coin-bottom-right"></div>
                  </div>
                  <div className="header-container">
                    <div className="logo-section">
                      <img src="/images/logo.png" alt="Super Siesta Logo" />
                      <div className="logo-subtitle">service en ligne</div>
                    </div>
                    <div className="bl-banner">
                      <div className="bl-banner-content">
                        <h1>BL en ligne</h1>
                        <p>Numéro {detail.delivery_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="main-body">
                    <div className="info-grid">
                      <div className="info-column">
                        <div className="section-title-box title-livreur">
                          <h2>Livreur</h2>
                        </div>
                        <div className="delivery-info">
                          <div className="info-row">
                            <span className="info-label">Livreur :</span>
                            <p><span>{detail.delivery_man?.name || detail.delivery_man_name || "Non assigné"}</span></p>
                          </div>
                          {detail.delivery_man?.phone && (
                            <div className="info-row">
                              <span className="info-label">Tél :</span>
                              <p><span>{detail.delivery_man.phone}</span></p>
                            </div>
                          )}
                          {detail.delivery_man?.vehicle && (
                            <div className="info-row">
                              <span className="info-label">Véhicule :</span>
                              <p><span>{detail.delivery_man.vehicle}</span></p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="info-column">
                        <div style={{ textAlign: 'right' }}>
                          <div className="section-title-box title-client">
                            <h2>Coordonnées Client</h2>
                          </div>
                        </div>
                        <div className="client-info">
                          <div className="info-row">
                            <span className="info-label">Client :</span>
                            <p><span>{detail.full_name}</span></p>
                          </div>
                          {detail.phone && (
                            <div className="info-row">
                              <span className="info-label">Téléphone :</span>
                              <p><span>{detail.phone}</span></p>
                            </div>
                          )}
                          <div className="info-row">
                            <span className="info-label">Adresse :</span>
                            <p><span>{detail.delivery_address} {detail.delivery_city ? `, ${detail.delivery_city}` : ""}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th>Bon de Livraison</th>
                          <th>Date</th>
                          <th>Client</th>
                          <th>Bon de Commande</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{detail.delivery_number}</td>
                          <td>{new Date(detail.created_at).toLocaleDateString("fr-FR")}</td>
                          <td>#{detail.client_id?.substring(0, 4) || "1000"}</td>
                          <td>{detail.order?.order_number || "—"}</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="items-table">
                      <thead>
                        <tr>
                          <th style={{ width: '15%' }}>Référence</th>
                          <th style={{ width: '8%' }}>Qté</th>
                          <th style={{ width: '37%' }}>Désignation</th>
                          <th style={{ width: '25%', textAlign: 'center' }}>Détail (P.U x Qté)</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItems.map((it) => (
                          <React.Fragment key={it.id}>
                            <tr className="product-row">
                              <td><span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{it.product_name.substring(0, 10).toUpperCase()}</span></td>
                              <td style={{ textAlign: 'center', fontSize: '18px', fontWeight: '900' }}>{it.delivered_quantity}</td>
                              <td>
                                <div style={{ fontWeight: '800', fontSize: '16px' }}>{it.product_name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                  {it.size_label && `Taille: ${it.size_label}`}
                                  {it.grammage && ` — ${it.grammage}g`}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                                {it.unit_price ? `${Number(it.unit_price).toFixed(3)} x ${it.delivered_quantity}` : "—"}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '16px' }}>
                                {it.unit_price ? (Number(it.unit_price) * it.delivered_quantity).toFixed(3) : "—"}
                              </td>
                            </tr>
                            {(() => {
                              const productGammeName = (it as any).product?.gamme;
                              const gamme = gammes.find(g => g.name === productGammeName || g.slug === productGammeName || g.id === productGammeName);
                              const hasWarranty = gamme && gamme.warranty;
                              
                              // New logic: find gifts from dimensions
                              const currentDim = dimensions.find(d => d.label === it.size_label);
                              const sizeGifts = currentDim?.free_gifts || [];
                              const hasGifts = sizeGifts.length > 0;

                              if (hasWarranty || hasGifts) {
                                return (
                                  <tr className="gift-row">
                                    <td colSpan={5} style={{ padding: '8px 20px 12px 60px' }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {hasWarranty && (
                                          <div className="gift-text" style={{ borderColor: '#adc80a', color: '#1d2972', background: '#f7fee7' }}>
                                            <span style={{ background: '#adc80a', color: '#fff', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>GARANTIE</span>
                                            Garantie {gamme.warranty} ans
                                          </div>
                                        )}
                                        {sizeGifts.map((gift: any, gi: number) => (
                                          <div key={`gift-${it.id}-${gi}`} className="gift-text">
                                            {gift.titre} {(it.gifts_grammage?.[gift.id] || gift.poids) && `— ${(it.gifts_grammage?.[gift.id] || gift.poids)} g`}
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                              return null;
                            })()}
                          </React.Fragment>
                        ))}
                      </tbody>
                      {(detail as any).order_total && (
                        <tfoot>
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'right', padding: '15px 20px', fontWeight: '900', background: '#f8fafc', textTransform: 'uppercase', fontSize: '14px', border: '2px solid #adc80a' }}>Total Commande</td>
                            <td style={{ textAlign: 'right', padding: '15px 20px', fontWeight: '900', background: '#f7fee7', color: '#1d2972', fontSize: '20px', border: '2px solid #adc80a' }}>
                              {Number((detail as any).order_total).toFixed(3)} <span style={{ fontSize: '11px' }}>TND</span>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>

                    <div className="footer-layout">
                      <div className="note-section">
                        <h3>Note Client</h3>
                        <div className="note-box">
                          {detail.notes || "Aucune note particulière."}
                        </div>
                      </div>

                      <div className="signature-section">
                        <div className="signature-container">
                          <img src="/images/signature.png" alt="Signature" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
