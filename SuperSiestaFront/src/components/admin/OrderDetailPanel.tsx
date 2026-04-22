import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Clock, FileText, Phone, MapPin, User, Mail, 
  Download, Printer, AlertCircle, CheckCircle2, 
  Truck, XCircle, CheckCircle, ChevronRight, Info,
  Package, Calendar, CreditCard, Receipt, Loader2, Navigation
} from 'lucide-react';
// Progress bar moved to Delivery Note UI
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/apiClient';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useOrders, type Order, type OrderItem } from '@/hooks/useOrders';

interface Invoice {
  id: string;
  invoice_number: string;
}

interface DeliveryNote {
  id: string;
  delivery_number: string;
}

interface Props {
  orderId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export function OrderDetailPanel({ orderId, onClose, onRefresh }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<'invoice' | 'delivery' | null>(null);

  // Fetch order and items
  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      const [orderData, itemsData] = await Promise.all([
        api.get<Order>(`/orders/${orderId}`),
        api.get<OrderItem[]>(`/orders/${orderId}/items`),
      ]);

      setOrder(orderData!);
      setItems(itemsData || []);
    } catch (err: any) {
      toast.error('Erreur lors du chargement de la commande');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!order) return;
    try {
      await api.put(`/orders/${order.id}`, { status });
      setOrder({ ...order, status: status as Order['status'] });
      toast.success('Statut mis à jour');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const canGenerateDeliveryNote = () => {
    if (!order) return false;
    // Allow generation only when order is accepted or still allow accept+generate
    return order.status === 'accepté' || order.status === 'en_attente';
  };

  const hasDeliveryNoteReady = () => {
    if (!order) return false;
    return !!order.delivery_note_id;
  };

  const generateInvoice = async () => {
    if (!order) return;
    try {
      setGenerating('invoice');
      const response = await api.post<Invoice>(`/orders/${order.id}/to-invoice`, {});
      if (response?.id) {
        setOrder({ ...order, invoice_id: response.id });
        toast.success(`Facture créée: ${response.invoice_number}`);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création de la facture');
    } finally {
      setGenerating(null);
    }
  };

  const generateDeliveryNote = async () => {
    if (!order) return;
    try {
      setGenerating('delivery');
      const response = await api.post<DeliveryNote>(`/orders/${order.id}/to-delivery-note`, {});
      if (response?.id) {
        setOrder({ ...order, delivery_note_id: response.id });
        toast.success(`Bon de livraison créé: ${response.delivery_number}`);
        // Marquer la commande comme acceptée si nécessaire
        try {
          if (order.status !== 'accepté') await updateStatus('accepté');
        } catch (e) {
          console.error(e);
        }
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du BL');
    } finally {
      setGenerating(null);
    }
  };

  const downloadPDF = async (type: 'invoice' | 'delivery-note') => {
    try {
      const url = type === 'invoice' 
        ? `/invoices/${order?.invoice_id}/pdf`
        : `/delivery-notes/${order?.delivery_note_id}/pdf`;
      
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${type}-${order?.order_number}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success('PDF téléchargé avec succès');
    } catch (err: any) {
      toast.error('Erreur lors du téléchargement du PDF');
      console.error(err);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);

  const printDeliveryNote = async () => {
    if (!order?.delivery_note_id) return;
    try {
      toast.loading("Préparation de l'impression...");
      const [dn, items, orderItems] = await Promise.all([
        api.get<any>(`/delivery-notes/${order.delivery_note_id}`),
        api.get<any[]>(`/delivery-notes/${order.delivery_note_id}/items`),
        api.get<any[]>(`/orders/${order.id}/items`)
      ]);

      if (!dn) throw new Error("BL non trouvé");

      // Match prices
      const enrichedItems = items.map(di => {
        const oi = orderItems.find(o => o.product_name === di.product_name && o.size_label === di.size_label);
        return { ...di, unit_price: oi ? (oi.unit_price || oi.price) : undefined };
      });

      // Prepare print
      const win = window.open("", "_blank");
      if (!win) return;

      const styleStr = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        @page { size: A4; margin: 0mm; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; line-height: 1.5; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .doc-wrapper { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: #fff; position: relative; overflow: hidden; }
        
        .header-container { position: relative; padding: 40px 45px 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        .logo-section { z-index: 10; margin-top: -30px; flex: 1; }
        .logo-section img { height: 95px; object-fit: contain; }
        .logo-subtitle { font-size: 14px; font-weight: 500; color: #1d2972; margin-left: 30px; letter-spacing: 1px; }
        
        .green-stripe {
          position: absolute; top: 150px; left: -45px; width: 80%; height: 70px;
          background: #adc80a; z-index: 1; border-radius: 27px; transform: skewX(25deg); overflow: hidden;
        }
        .green-stripe-body { position: absolute; width: 100%; height: 100%; background: inherit; z-index: 1; }
        .coin-top-right, .coin-bottom-right { position: absolute; right: 0; width: 40px; height: 40px; background: #adc80a; z-index: 2; }
        .coin-top-right { top: 0; border-top-right-radius: 20px; }
        .coin-bottom-right { bottom: 0; border-bottom-right-radius: 20px; }

        .bl-banner { 
          position: relative; background: #1d2972; color: #fff; padding: 25px 50px; margin-right: -100px;
          text-align: center; box-shadow: -20px 15px 0px rgba(0, 0, 0, 0.20); z-index: 10;
          min-width: 440px; border-radius: 30px; transform: skewX(25deg);
        }
        .bl-banner-content { transform: skewX(-25deg); }
        .bl-banner h1 { margin: 0; font-size: 48px; font-weight: 900; text-transform: uppercase; letter-spacing: -1.5px; line-height: 1; }
        .bl-banner p { margin: 5px 0 0; font-size: 18px; font-weight: 700; opacity: 0.9; }

        .main-body { position: relative; z-index: 2; padding: 20px 45px; margin-top: 60px; }
        .info-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; gap: 40px; }
        .info-column { flex: 1; }
        .section-title-box { background: #1d2972; color: #fff; padding: 15px 40px; text-align: center; z-index: 10; border-radius: 20px; transform: skewX(25deg); display: inline-block; margin-bottom: 25px; }
        .title-livreur { margin-left: -75px; box-shadow: 15px 15px 0px rgba(0, 0, 0, 0.15); }
        .title-client { margin-right: -75px; box-shadow: -15px 15px 0px rgba(0, 0, 0, 0.15); }
        .section-title-box h2 { margin: 0; font-size: 22px; font-weight: 800; transform: skewX(-25deg); }
        
        .info-row { display: flex; gap: 15px; margin: 8px 0; align-items: baseline; }
        .delivery-info .info-row { justify-content: flex-start; text-align: left; }
        .client-info .info-row { justify-content: flex-end; text-align: right; }
        .client-info p, .delivery-info p { margin: 0; font-weight: 500; color: #334155; }
        .client-info span, .delivery-info span { font-weight: 800; color: #000; }
        .info-label { font-size: 11px; color: #64748b; font-weight: 900; text-transform: uppercase; min-width: 80px; }

        .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #adc80a; }
        .summary-table th { background: #fff; padding: 10px 20px; font-size: 13px; font-weight: 900; border: 2px solid #adc80a; }
        .summary-table td { background: #f7fee7; padding: 10px 20px; font-size: 16px; font-weight: 700; border: 2px solid #adc80a; }
        
        .items-table { width: 100%; border-collapse: collapse; border: 2px solid #adc80a; margin-bottom: 30px; }
        .items-table th { padding: 15px 20px; font-size: 14px; font-weight: 900; border: 2px solid #adc80a; text-transform: uppercase; }
        .items-table td { padding: 15px 20px; font-size: 16px; font-weight: 600; border: 2px solid #adc80a; }
        .gift-row td { padding: 0 20px 12px 60px; border: 2px solid #adc80a; border-top: none; }
        .gift-text { color: #15803d; font-weight: 700; font-size: 12px; background: #f0fdf4; padding: 5px 15px; border-radius: 10px; border: 1.5px dashed #86efac; display: inline-flex; align-items: center; gap: 8px; }
        .gift-text::before { content: "OFFERT"; background: #16a34a; color: #fff; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; }
        
        .note-box { border: 2px solid #adc80a; border-radius: 25px; min-height: 80px; padding: 15px 25px; font-size: 15px; }
      `;

      const contentHtml = `
        <div class="doc-wrapper">
          <div class="green-stripe">
            <div class="green-stripe-body"></div>
            <div class="coin-top-right"></div>
            <div class="coin-bottom-right"></div>
          </div>
          <div class="header-container">
            <div class="logo-section">
              <img src="/images/logo.png" alt="Logo" />
              <div class="logo-subtitle">service en ligne</div>
            </div>
            <div class="bl-banner">
              <div class="bl-banner-content">
                <h1>BL en ligne</h1>
                <p>Numéro ${dn.delivery_number}</p>
              </div>
            </div>
          </div>
          <div class="main-body">
            <div class="info-grid">
              <div class="info-column">
                <div class="section-title-box title-livreur"><h2>Livreur</h2></div>
                <div class="delivery-info">
                  <div class="info-row"><span class="info-label">Livreur :</span><p><span>${dn.delivery_man?.name || dn.delivery_man_name || "Non assigné"}</span></p></div>
                  ${dn.delivery_man?.phone ? `<div class="info-row"><span class="info-label">Tél :</span><p><span>${dn.delivery_man.phone}</span></p></div>` : ""}
                </div>
              </div>
              <div class="info-column">
                <div style="text-align: right"><div class="section-title-box title-client"><h2>Coordonnées Client</h2></div></div>
                <div class="client-info">
                  <div class="info-row"><span class="info-label">Client :</span><p><span>${dn.full_name}</span></p></div>
                  <div class="info-row"><span class="info-label">Tél :</span><p><span>${dn.phone} ${dn.phone2 ? ` / ${dn.phone2}` : ""}</span></p></div>
                  <div class="info-row"><span class="info-label">Adresse :</span><p><span>${dn.delivery_address} ${dn.delivery_city || ""}</span></p></div>
                </div>
              </div>
            </div>
            <table class="summary-table">
              <tr><th>Date</th><td>${new Date(dn.created_at).toLocaleDateString("fr-FR")}</td></tr>
              <tr><th>Commande</th><td>#${order.order_number}</td></tr>
            </table>
            <table class="items-table">
              <thead><tr><th>Produit</th><th style="text-align:center">P.U x Qté</th><th style="text-align:center">Qté</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${enrichedItems.map(it => `
                  <tr>
                    <td>${it.product_name}<br/><span style="font-size:11px;opacity:0.7">${it.size_label} ${it.grammage ? `— ${it.grammage}g` : ""}</span></td>
                    <td style="text-align:center; font-size:12px">${it.unit_price ? `${Number(it.unit_price).toFixed(3)} x ${it.delivered_quantity}` : "—"}</td>
                    <td style="text-align:center">${it.delivered_quantity}</td>
                    <td style="text-align:right">${it.unit_price ? (it.unit_price * it.delivered_quantity).toFixed(3) : "—"}</td>
                  </tr>
                  ${(it.product?.free_gifts || []).map(g => `
                    <tr class="gift-row"><td colspan="4"><div class="gift-text">${g.titre} ${it.gifts_grammage?.[g.id] ? `— ${it.gifts_grammage[g.id]}g` : ""}</div></td></tr>
                  `).join("")}
                `).join("")}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align:right; padding:15px 20px; font-weight:900; background:#f8fafc; text-transform:uppercase; font-size:14px; border: 2px solid #adc80a;">Total de la commande</td>
                  <td style="text-align:right; padding:15px 20px; font-weight:900; background:#f7fee7; color:#1d2972; font-size:20px; border: 2px solid #adc80a;">${Number(order.total).toFixed(3)} <span style="font-size:12px">TND</span></td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:30px"><h3>Note Client</h3><div class="note-box">${dn.notes || "Aucune note."}</div></div>
          </div>
        </div>
      `;

      win.document.head.innerHTML = `<title>BL ${dn.delivery_number}</title><style>${styleStr}</style>`;
      win.document.body.innerHTML = contentHtml;
      
      setTimeout(() => {
        win.print();
        toast.dismiss();
      }, 500);

    } catch (err) {
      toast.error("Erreur d'impression");
    }
  };

  if (loading) {
// ... existing code ...
  }

  // ... (keeping everything else same, just updating the return JSX for the printer button)

  // In the return statement, find the Printer button and update it:
  // <Button size="sm" variant="outline" onClick={printDeliveryNote}> ...

  if (!order) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>Commande non trouvée</p>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string, icon: any, color: string, bg: string }> = {
    en_attente: { label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    'accepté': { label: 'Acceptée', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    annulée: { label: 'Annulée', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  };

  const currentStatus = statusConfig[order.status] || statusConfig.en_attente;

  const HeaderIcon = (currentStatus.icon || Clock) as any;
  const TrackIcon = (statusConfig[order.status]?.icon || Clock) as any;

  return (
    <div className="space-y-6 pb-6">
      {/* Header with quick info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${currentStatus.bg} ${currentStatus.color}`}>
            <HeaderIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">#{order.order_number}</h2>
              <Badge variant="outline" className={`${currentStatus.bg} ${currentStatus.color} border-current/20`}>
                {currentStatus.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Le {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 self-end md:self-center">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total HT</p>
            <p className="text-lg font-medium">{formatPrice(order.subtotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total TTC</p>
            <p className="text-2xl font-black text-primary">{formatPrice(order.total)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tracking & Status Change */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tracking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Suivi de la commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${statusConfig[order.status]?.bg} ${statusConfig[order.status]?.color}`}>
                      <TrackIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{statusConfig[order.status]?.label}</div>
                      <div className="text-xs text-muted-foreground">Statut actuel de la commande</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === 'en_attente' && (
                      <>
                        <Button size="sm" variant="default" onClick={() => updateStatus('accepté')}>Accepter</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus('annulée')}>Annuler</Button>
                      </>
                    )}
                    {order.status === 'accepté' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus('annulée')}>Annuler</Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Articles commandés ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-all group">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="w-1/2 h-1/2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] h-4 py-0 leading-none">
                          Taille: {item.size_label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Unité: {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col justify-center">
                      <p className="font-black text-sm text-primary">{formatPrice(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-muted-foreground font-medium">Sous-total (HT)</span>
                  <span className="font-bold">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xl pt-2 border-t border-primary/20 mt-2 font-black">
                  <span className="text-primary/70">TOTAL TTC</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer Info & Documents */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 py-0.5">
                <User className="w-4 h-4 text-primary" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Destinataire</p>
                  <p className="font-bold text-sm">{order.full_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email</p>
                  <p className="font-medium text-sm break-all">{order.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 text-green-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Téléphone</p>
                  <p className="font-medium text-sm">
                    {order.phone}
                    {order.phone2 && <span className="block text-[11px] text-muted-foreground opacity-80">Alt: {order.phone2}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Livraison</p>
                  <p className="font-medium text-sm leading-snug">{order.address}</p>
                  <p className="text-xs font-bold text-muted-foreground">{order.city}</p>
                  {order.latitude && order.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline mt-2 bg-primary/5 px-2 py-1 rounded"
                    >
                      <Navigation className="w-3 h-3" />
                      ITINÉRAIRE GOOGLE MAPS
                    </a>
                  )}
                </div>
              </div>

              {order.notes && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Instructions</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-normal italic">
                    "{order.notes}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documents Administratifs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Delivery Note */}
              <div className="group relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className={`w-4 h-4 ${order.delivery_note_id ? 'text-indigo-600' : 'text-muted-foreground opacity-40'}`} />
                    <span className="text-xs font-bold uppercase">Bon de livraison</span>
                  </div>
                  {order.delivery_note_id ? (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 h-5 px-1.5 text-[10px]">Prêt</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-dashed">Non généré</Badge>
                  )}
                </div>
                
                {hasDeliveryNoteReady() ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={printDeliveryNote}
                    className="w-full h-10 text-[11px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    IMPRIMER LE BON DE LIVRAISON
                  </Button>
                  ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={generateDeliveryNote}
                    disabled={
                      generating === 'delivery' || !canGenerateDeliveryNote() || !!order.delivery_note_id
                    }
                    className="w-full h-8 text-[11px] font-bold"
                  >
                    {generating === 'delivery' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        GÉNÉRATION...
                      </>
                    ) : (
                      'GÉNÉRER MAINTENANT'
                    )}
                  </Button>
                )}
                {!canGenerateDeliveryNote() && !order.delivery_note_id && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border">
                    <Info className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground leading-tight italic">
                      Génération impossible pour une commande annulée.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {onClose && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Fermer le panneau
          </Button>
        </div>
      )}
    </div>
  );
}

// End of file
