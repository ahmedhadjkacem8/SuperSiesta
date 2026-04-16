import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, FileText, Receipt, Plus, X, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { products } from "@/data/products";
import { api } from "@/lib/apiClient";
import { confirmDelete } from "@/lib/swal";
import { formatPrice } from "@/lib/utils";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string | null;
  quote_id: string | null;
  status: string;
  total: number;
  tax_rate: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  clients?: { full_name: string } | null;
}

interface Client { id: string; full_name: string; email: string | null; phone: string | null; address: string | null; city: string | null; }

export default function AdminFactures() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ invoice_number: "", client_id: "", status: "brouillon", tax_rate: "19", due_date: "" });
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const [pdfInvoice, setPdfInvoice] = useState<Invoice | null>(null);
  const [pdfItems, setPdfItems] = useState<LineItem[]>([]);
  const [pdfClient, setPdfClient] = useState<Client | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await api.get<Invoice[]>("/invoices");
      setInvoices(data || []);
      const cl = await api.get<Client[]>("/clients");
      setClients(cl || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  useEffect(() => { load(); }, []);

  const fetchNextNumber = async () => {
    try {
      const { next_number } = await api.get<{ next_number: string }>("/invoices/next-number");
      setForm(prev => ({ ...prev, invoice_number: next_number }));
    } catch {
      setForm(prev => ({ ...prev, invoice_number: `FAC-${Date.now().toString(36).toUpperCase()}` }));
    }
  };

  const resetForm = () => {
    setForm({ invoice_number: "", client_id: "", status: "brouillon", tax_rate: "19", due_date: "" });
    setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
    setEditing(null);
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      item.total = item.quantity * item.unit_price;
      next[index] = item;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const taxRate = parseFloat(form.tax_rate) || 0;
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const selectProduct = (index: number, slug: string) => {
    const product = products.find((p) => p.slug === slug);
    if (!product) return;
    const minPrice = Math.min(...product.sizes.map((s) => s.price));
    updateItem(index, "description", product.name);
    updateItem(index, "unit_price", minPrice);
  };

  const handleSave = async () => {
    const payload = {
      invoice_number: form.invoice_number,
      client_id: form.client_id || null,
      status: form.status,
      total: grandTotal,
      tax_rate: taxRate,
      due_date: form.due_date || null,
    };
    if (editing) {
      try {
        await api.put(`/invoices/${editing.id}`, { ...payload, items });
        toast.success("Facture mise à jour");
        setOpen(false); resetForm(); load();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la mise à jour");
      }
    } else {
      try {
        await api.post("/invoices", { ...payload, items });
        toast.success("Facture créée");
        setOpen(false); resetForm(); load();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la création");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Supprimer cette facture ?", "Cette action peut fausser votre comptabilité s'il s'agit d'une facture officielle."))) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success("Facture supprimée"); load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const openEdit = async (inv: Invoice) => {
    setEditing(inv);
    setForm({ invoice_number: inv.invoice_number, client_id: inv.client_id || "", status: inv.status, tax_rate: String(inv.tax_rate), due_date: inv.due_date || "" });
    try {
      const data = await api.get<any[]>(`/invoices/${inv.id}/items`);
      if (data && data.length > 0) {
        setItems(data.map((d: any) => ({ description: d.description, quantity: d.quantity, unit_price: Number(d.unit_price), total: Number(d.total) })));
      } else {
        setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
      }
    } catch (err: any) {
      setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
    }
    setOpen(true);
  };

  const viewPdf = async (inv: Invoice) => {
    setPdfInvoice(inv);
    const client = clients.find((c) => c.id === inv.client_id) || null;
    setPdfClient(client);
    try {
      const data = await api.get<any[]>(`/invoices/${inv.id}/items`);
      setPdfItems((data || []).map((d: any) => ({ description: d.description, quantity: d.quantity, unit_price: Number(d.unit_price), total: Number(d.total) })));
    } catch (err: any) {
      toast.error("Erreur lors du chargement des articles");
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Facture ${pdfInvoice?.invoice_number}</title><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:800px;margin:auto}
      table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
      th{background:#f5f5f5}.total-row{font-weight:bold}.header{display:flex;justify-content:space-between;margin-bottom:30px}
      h1{font-size:22px;margin:0}h2{font-size:16px;color:#666}.info{margin-bottom:20px;font-size:13px}.info p{margin:2px 0}
      .totals{float:right;width:250px;margin-top:10px}.totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
      .totals .grand{border-top:2px solid #333;font-weight:bold;font-size:15px;padding-top:8px}
      @media print{body{padding:20px}}
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const statusColor = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = { brouillon: "outline", envoyée: "secondary", payée: "default", annulée: "destructive" };
    return map[s] || "outline";
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Factures</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); else if (!editing) fetchNextNumber(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nouvelle facture</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="N° Facture (auto)" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["brouillon", "envoyée", "payée", "annulée"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Échéance" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>

              {/* Line items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold">Articles</p>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Ligne</Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2">
                          <Select onValueChange={(v) => selectProduct(i, v)}>
                            <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Produit..." /></SelectTrigger>
                            <SelectContent>
                              {products.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="text-xs h-8" />
                        </div>
                      </div>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="w-16 text-xs h-8" min={1} />
                      <Input type="number" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className="w-24 text-xs h-8" step="0.001" />
                      <span className="text-xs font-medium w-20 text-right pt-2">{formatPrice(item.total)}</span>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}><X className="w-3 h-3" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Sous-total</span><span className="font-medium">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">TVA <Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="w-16 h-6 text-xs inline" /> %</span>
                  <span className="font-medium">{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-1"><span>Total TTC</span><span>{formatPrice(grandTotal)}</span></div>
              </div>

              <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Total TTC</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune facture</TableCell></TableRow>}
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                <TableCell>{inv.clients?.full_name || "—"}</TableCell>
                <TableCell><Badge variant={statusColor(inv.status)} className="capitalize">{inv.status}</Badge></TableCell>
                <TableCell>{formatPrice(inv.total)}</TableCell>
                <TableCell>{inv.tax_rate}%</TableCell>
                <TableCell className="text-sm">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-TN") : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} title="Modifier"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => viewPdf(inv)} title="Imprimer"><Printer className="w-4 h-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} title="Supprimer"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={!!pdfInvoice} onOpenChange={(v) => { if (!v) setPdfInvoice(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Aperçu Facture</span>
              <Button size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" /> Imprimer / PDF</Button>
            </DialogTitle>
          </DialogHeader>
          <div ref={printRef}>
            {pdfInvoice && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
                  <div>
                    <h1 style={{ fontSize: 22, margin: 0 }}>Super Siesta</h1>
                    <p style={{ color: "#666", fontSize: 13 }}>Matelas & Literie</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h2 style={{ fontSize: 18, margin: 0 }}>FACTURE</h2>
                    <p style={{ fontSize: 13, margin: "2px 0" }}>{pdfInvoice.invoice_number}</p>
                    <p style={{ fontSize: 13, margin: "2px 0" }}>Date : {new Date(pdfInvoice.created_at).toLocaleDateString("fr-TN")}</p>
                    {pdfInvoice.due_date && <p style={{ fontSize: 13, margin: "2px 0" }}>Échéance : {new Date(pdfInvoice.due_date).toLocaleDateString("fr-TN")}</p>}
                  </div>
                </div>
                {pdfClient && (
                  <div style={{ marginBottom: 20, fontSize: 13 }}>
                    <p style={{ fontWeight: "bold", margin: "0 0 4px" }}>Client :</p>
                    <p style={{ margin: "2px 0" }}>{pdfClient.full_name}</p>
                    {pdfClient.email && <p style={{ margin: "2px 0" }}>{pdfClient.email}</p>}
                    {pdfClient.phone && <p style={{ margin: "2px 0" }}>Tél : {pdfClient.phone}</p>}
                    {pdfClient.address && <p style={{ margin: "2px 0" }}>{pdfClient.address}{pdfClient.city ? `, ${pdfClient.city}` : ""}</p>}
                  </div>
                )}
                <table>
                  <thead>
                    <tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {pdfItems.map((it, i) => (
                      <tr key={i}><td>{it.description}</td><td>{it.quantity}</td><td>{formatPrice(it.unit_price)}</td><td>{formatPrice(it.total)}</td></tr>
                    ))}
                    {pdfItems.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#999" }}>Aucun article</td></tr>}
                  </tbody>
                </table>
                <div style={{ float: "right", width: 250, marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span>Sous-total</span>
                    <span>{formatPrice(pdfItems.reduce((s, it) => s + it.total, 0))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span>TVA ({pdfInvoice.tax_rate}%)</span>
                    <span>{formatPrice(pdfItems.reduce((s, it) => s + it.total, 0) * pdfInvoice.tax_rate / 100)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px", fontSize: 15, fontWeight: "bold", borderTop: "2px solid #333" }}>
                    <span>Total TTC</span>
                    <span>{formatPrice(pdfInvoice.total)}</span>
                  </div>
                </div>
                <div style={{ clear: "both" }} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
