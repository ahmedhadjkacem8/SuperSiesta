import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Clock, FileText, Phone, MapPin, User, Mail, 
  Download, Printer, AlertCircle, CheckCircle2, 
  Truck, XCircle, CheckCircle, ChevronRight, Info,
  Package, Calendar, CreditCard, Receipt, Loader2, Navigation
} from 'lucide-react';
// Progress bar moved to Delivery Note UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/apiClient';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [paymentProofIsPdf, setPaymentProofIsPdf] = useState(false);
  const [selectedPaymentProof, setSelectedPaymentProof] = useState<File | null>(null);
  const [selectedPaymentProofPreview, setSelectedPaymentProofPreview] = useState<string | null>(null);
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const [zoomedPaymentProof, setZoomedPaymentProof] = useState<{ src: string; isPdf: boolean } | null>(null);

  // Fetch order and items
  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  useEffect(() => {
    if (!order?.has_payment_proof) {
      setPaymentProofPreview(null);
      return;
    }

    let active = true;
    let previewUrl: string | null = null;
    api.getBlob(`/admin/orders/${order.id}/payment-proof`)
      .then((file) => {
        previewUrl = URL.createObjectURL(file);
        if (active) {
          setPaymentProofPreview(previewUrl);
          setPaymentProofIsPdf(file.type === 'application/pdf');
        } else {
          URL.revokeObjectURL(previewUrl);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : 'Impossible de charger le justificatif');
        }
      });

    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [order?.id, order?.has_payment_proof, order?.updated_at]);

  useEffect(() => {
    if (!selectedPaymentProof) {
      setSelectedPaymentProofPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedPaymentProof);
    setSelectedPaymentProofPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedPaymentProof]);

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const [orderData, itemsData] = await Promise.all([
        api.get<Order>(`/orders/${orderId}?t=${timestamp}`),
        api.get<OrderItem[]>(`/orders/${orderId}/items?t=${timestamp}`),
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

  const hasSurCommande = useMemo(() => items.some(item => Number(item.unit_price || (item as any).price || 0) === 0), [items]);

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    if (!order || newPrice < 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }
    try {
      await api.put(`/orders/${order.id}/items/${itemId}`, { unit_price: newPrice });
      toast.success('Prix mis à jour');
      fetchOrderData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour du prix');
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

  const uploadPaymentProof = async (file: File) => {
    if (!order) return;
    const formData = new FormData();
    formData.append('payment_proof', file);

    try {
      setUploadingPaymentProof(true);
      await api.post(`/admin/orders/${order.id}/payment-proof`, formData);
      toast.success('Justificatif ajouté à la commande');
      setSelectedPaymentProof(null);
      await fetchOrderData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l’envoi du justificatif');
    } finally {
      setUploadingPaymentProof(false);
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
      const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}${url}`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <span>Le {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
                        <Button 
                          size="sm" 
                          variant="default" 
                          onClick={() => updateStatus('accepté')}
                          disabled={hasSurCommande}
                          title={hasSurCommande ? "Veuillez définir les prix 'sur commande' avant d'accepter" : ""}
                        >
                          Accepter
                        </Button>
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
              {hasSurCommande && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-[10px] font-black uppercase">
                    Attention : Certains articles sont "sur commande". Vous devez définir leur prix avant d'accepter la commande.
                  </p>
                </div>
              )}
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
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {(() => {
                          const currentPrice = Number(item.unit_price ?? (item as any).price ?? 0);
                          return currentPrice === 0 ? (
                            <div className="flex flex-col gap-1.5 py-1">
                              <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase w-fit">
                                Prix à définir (Sur commande)
                              </span>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  placeholder="Entrez le prix" 
                                  className="w-32 h-8 text-xs font-bold border-amber-200 focus:border-amber-500 bg-amber-50/30"
                                  autoFocus
                                  onBlur={(e) => {
                                    if (e.target.value) updateItemPrice(item.id, Number(e.target.value));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateItemPrice(item.id, Number((e.target as HTMLInputElement).value));
                                    }
                                  }}
                                />
                                <span className="text-[10px] font-medium text-muted-foreground italic">
                                  ↵ Entrée pour valider
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>Unité: {formatPrice(item.unit_price)}</span>
                              {order.status === 'en_attente' && (
                                <button 
                                  onClick={() => updateItemPrice(item.id, 0)}
                                  className="text-[10px] text-primary hover:underline font-bold bg-primary/5 px-1.5 py-0.5 rounded"
                                  title="Réinitialiser le prix pour le modifier"
                                >
                                  Modifier le prix
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col justify-center">
                      <p className="font-black text-sm text-primary">{formatPrice(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {(order.requires_special_discount || order.has_payment_proof) && (
                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold">Justificatif de virement</p>
                  </div>

                  {selectedPaymentProof && selectedPaymentProofPreview ? (
                    <button
                      type="button"
                      onClick={() => setZoomedPaymentProof({
                        src: selectedPaymentProofPreview,
                        isPdf: selectedPaymentProof.type === 'application/pdf',
                      })}
                      className="mb-2 flex items-center gap-3 rounded-md border border-border bg-background p-2 text-left hover:border-primary"
                      title="Cliquer pour agrandir"
                    >
                      {selectedPaymentProof.type === 'application/pdf' ? (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-primary">PDF</span>
                      ) : (
                        <img src={selectedPaymentProofPreview} alt="Aperçu du justificatif sélectionné" className="h-14 w-14 shrink-0 rounded object-cover" />
                      )}
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{selectedPaymentProof.name} · Cliquer pour agrandir</span>
                    </button>
                  ) : paymentProofPreview ? (
                    <button
                      type="button"
                      onClick={() => setZoomedPaymentProof({ src: paymentProofPreview, isPdf: paymentProofIsPdf })}
                      className="mb-2 flex items-center gap-3 rounded-md border border-border bg-background p-2 text-left hover:border-primary"
                      title="Cliquer pour agrandir"
                    >
                      {paymentProofIsPdf ? (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-primary">PDF</span>
                      ) : (
                        <img src={paymentProofPreview} alt="Aperçu du justificatif enregistré" className="h-14 w-14 shrink-0 rounded object-cover" />
                      )}
                      <span className="text-xs text-muted-foreground">Cliquer pour agrandir</span>
                    </button>
                  ) : (
                    <p className="mb-2 text-xs text-muted-foreground">Aucun justificatif transmis.</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="min-w-0 text-xs font-medium">
                      {order.has_payment_proof ? 'Remplacer le fichier' : 'Ajouter un fichier (facultatif)'}
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        disabled={uploadingPaymentProof}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = '';
                          if (file) setSelectedPaymentProof(file);
                        }}
                        className="mt-1 block max-w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:font-semibold file:text-primary"
                      />
                    </label>
                    {selectedPaymentProof && (
                      <div className="flex shrink-0 gap-2">
                        <Button type="button" size="sm" variant="ghost" disabled={uploadingPaymentProof} onClick={() => setSelectedPaymentProof(null)}>
                          Supprimer
                        </Button>
                        <Button type="button" size="sm" disabled={uploadingPaymentProof} onClick={() => void uploadPaymentProof(selectedPaymentProof)}>
                          {uploadingPaymentProof ? 'Envoi...' : 'Enregistrer'}
                        </Button>
                      </div>
                    )}
                  </div>
                  {uploadingPaymentProof && <p className="mt-1 text-xs text-muted-foreground">Envoi en cours...</p>}
                </div>
              )}
              
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-muted-foreground font-medium">Sous-total (HT)</span>
                  <span className="font-bold">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xl pt-2 border-t border-primary/20 mt-2 font-black">
                  <span className="text-primary">TOTAL TTC</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>

              <Dialog open={zoomedPaymentProof !== null} onOpenChange={(open) => {
                if (!open) setZoomedPaymentProof(null);
              }}>
                <DialogContent className="max-h-[90vh] max-w-5xl overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Justificatif de virement</DialogTitle>
                  </DialogHeader>
                  {zoomedPaymentProof?.isPdf ? (
                    <iframe src={zoomedPaymentProof.src} title="Justificatif de virement agrandi" className="h-[75vh] w-full rounded border" />
                  ) : zoomedPaymentProof ? (
                    <img src={zoomedPaymentProof.src} alt="Justificatif de virement agrandi" className="mx-auto max-h-[75vh] max-w-full object-contain" />
                  ) : null}
                </DialogContent>
              </Dialog>
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
                      aria-label="Ouvrir l’itinéraire Google Maps (s'ouvre dans un nouvel onglet)"
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

                {order.bl_contact && (
                  <div className="mb-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 flex flex-col gap-1.5 text-xs text-emerald-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base shrink-0">📄</span>
                      <span className="font-bold shrink-0 whitespace-nowrap">Contact BL Provisoire :</span>
                    </div>
                    <span className="font-medium bg-emerald-100/50 px-2 py-1 rounded break-words">
                      {order.bl_contact}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2 gap-2">

                  <div className="flex items-center gap-2 min-w-0">
                    <Truck className={`w-4 h-4 shrink-0 ${order.delivery_note_id ? 'text-indigo-600' : 'text-muted-foreground opacity-40'}`} />
                    <span className="text-xs font-bold uppercase">Bon de livraison</span>
                  </div>
                  {order.delivery_note_id ? (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 h-5 px-1.5 text-[10px] shrink-0">Prêt</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-dashed shrink-0">Non généré</Badge>
                  )}
                </div>

                {hasDeliveryNoteReady() ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold uppercase">BL Généré avec succès</span>
                      <span className="text-[10px] opacity-80 leading-tight">À imprimer depuis la section Bons de Livraison</span>
                    </div>
                  </div>
                  ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={generateDeliveryNote}
                    disabled={
                      generating === 'delivery' || !canGenerateDeliveryNote() || !!order.delivery_note_id || hasSurCommande
                    }
                    className="w-full h-8 text-[11px] font-bold"
                  >
                    {generating === 'delivery' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin shrink-0" />
                        <span>GÉNÉRATION...</span>
                      </>
                    ) : (
                      'GÉNÉRER MAINTENANT'
                    )}
                  </Button>
                )}
                {!canGenerateDeliveryNote() && !order.delivery_note_id && (
                  <div className="mt-2 flex items-start gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border">
                    <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
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
