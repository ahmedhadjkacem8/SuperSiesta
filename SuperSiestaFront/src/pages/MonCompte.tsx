import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthSecure";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, LogOut, Loader2, Save, Package, Clock, CheckCircle, Truck, XCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatPrice } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  'accepté': { label: "Acceptée", color: "bg-blue-100 text-blue-800" },
  'livrée': { label: "Livrée", color: "bg-green-100 text-green-800" },
  'annulée': { label: "Annulée", color: "bg-red-100 text-red-800" },
};

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  city: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  size_label: string;
  unit_price: number;
  quantity: number;
  total: number;
}

export default function MonCompte() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", city: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [tab, setTab] = useState<"profil" | "commandes">("profil");

  useEffect(() => { if (!isLoading && !user) navigate("/connexion"); }, [isLoading, user]);

  useEffect(() => {
    if (user) {
      api.get<any>("/user/profile").then((data) => {
        if (data) { 
          setProfile(data); 
          setForm({ 
            full_name: data.full_name || "", 
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || ""
          }); 
        }
      }).catch(() => {});
      api.get<Order[]>("/user/orders").then((data) => {
        setOrders(data || []);
      }).catch(() => {});
    }
  }, [user]);

  const loadOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) { setExpandedOrder(expandedOrder === orderId ? null : orderId); return; }
    try {
      const data = await api.get<OrderItem[]>(`/orders/${orderId}/items`);
      setOrderItems((prev) => ({ ...prev, [orderId]: data || [] }));
      setExpandedOrder(orderId);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des articles");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.put("/user/profile", { 
        full_name: form.full_name, 
        phone: form.phone,
        address: form.address,
        city: form.city
      });
      toast.success("Profil mis à jour !");
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour");
    }
    setSaving(false);
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (isLoading) return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></main>;
  if (!user) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-6">Mon Compte</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
        <button onClick={() => setTab("profil")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${tab === "profil" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>Profil</button>
        <button onClick={() => setTab("commandes")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${tab === "commandes" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
          Commandes {orders.length > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{orders.length}</span>}
        </button>
      </div>

      {tab === "profil" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-bold">
              {(form.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{form.full_name || "Mon profil"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {profile?.account_type === "btob" && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-bold mt-1 inline-block">Compte BtoB</span>}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold mb-1 block">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={user.email || ""} disabled className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-muted text-sm text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+216..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Adresse</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Rue, n°, immeuble..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Ville</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sélectionner une ville...</option>
                  {["Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
            </button>
            <button onClick={handleLogout} className="bg-muted text-foreground font-bold py-3 px-6 rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-2 text-sm">
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </div>
        </div>
      )}

      {tab === "commandes" && (
        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Aucune commande pour le moment</p>
            </div>
          )}
          {orders.map((o) => {
            const si = STATUS_MAP[o.status] || STATUS_MAP.en_attente;
            const expanded = expandedOrder === o.id;
            return (
              <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button onClick={() => loadOrderItems(o.id)} className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold">{o.order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${si.color}`}>{si.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} — {o.city}</p>
                  </div>
                  <p className="font-black text-primary">{formatPrice(o.total)}</p>
                </button>
                {expanded && orderItems[o.id] && (
                  <div className="border-t border-border p-4 space-y-2 bg-muted/30">
                    {orderItems[o.id].map((item) => (
                      <div key={item.id} className="flex gap-3">
                        {item.product_image && <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">Taille {item.size_label} × {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold">{formatPrice(item.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
