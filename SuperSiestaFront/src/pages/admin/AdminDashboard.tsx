import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Receipt, Wallet, TrendingUp, ShoppingCart, Truck, AlertCircle, Star } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "@/lib/apiClient";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--secondary))", "#f59e0b", "#10b981"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, quotes: 0, invoices: 0, treasury: 0, orders: 0, pendingPayments: 0, deliveredOrders: 0, outstandingInvoices: 0, averageRating: 5.0 });
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [clientsData, quotesData, invoicesData, t, itemsData, ordersData, reviewsData] = await Promise.all([
          api.get<any[]>("/clients"),
          api.get<any[]>("/quotes"),
          api.get<any[]>("/invoices"),
          api.get<any[]>("/treasury-entries"),
          Promise.resolve([]),
          api.get<any[]>("/orders"),
          api.get<{ average: number }>("/published-reviews"),
        ]);

        const balance = (t || []).reduce((sum: number, e: any) =>
          sum + (e.type === "entrée" ? Number(e.amount) : -Number(e.amount)), 0);

        const orders = ordersData || [];
        const deliveredOrders = orders.filter((o: any) => o.status === "livree").length;

        const allInvoices = invoicesData || [];
        const pendingPayments = allInvoices
          .filter((inv: any) => inv.status !== "payée" && inv.status !== "annulée")
          .reduce((s: number, inv: any) => s + Number(inv.total), 0);
        const outstandingInvoices = allInvoices.filter((inv: any) => inv.status !== "payée" && inv.status !== "annulée").length;

        setStats({
          clients: clientsData?.length || 0,
          quotes: quotesData?.length || 0,
          invoices: allInvoices.length,
          treasury: balance,
          orders: orders.length,
          pendingPayments,
          deliveredOrders,
          outstandingInvoices,
          averageRating: (reviewsData as any)?.average || 5.0,
        });

      // Revenue by month
      const monthMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      allInvoices.forEach((inv: any) => {
        const d = new Date(inv.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap[key] = (monthMap[key] || 0) + Number(inv.total);
        statusMap[inv.status] = (statusMap[inv.status] || 0) + 1;
      });

      const months = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, revenue]) => ({
          month: new Date(month + "-01").toLocaleDateString("fr-TN", { month: "short", year: "2-digit" }),
          revenue,
        }));
      setRevenueData(months);
      setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Top products
      const productMap: Record<string, number> = {};
      
      // In Laravel, invoice items are usually embedded. Let's calculate from allInvoices if it has items.
      allInvoices.forEach((inv: any) => {
        if (inv.items) {
          inv.items.forEach((it: any) => {
            productMap[it.description || it.product_name] = (productMap[it.description || it.product_name] || 0) + (it.quantity || 1);
          });
        }
      });
      setTopProducts(
        Object.entries(productMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      );
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Commandes", value: stats.orders, icon: ShoppingCart, color: "text-primary" },
    { label: "Clients", value: stats.clients, icon: Users, color: "text-blue-500" },
    { label: "Note Moyenne", value: `${stats.averageRating}/5`, icon: Star, color: "text-yellow-500" },
    // { label: "Trésorerie", value: `${stats.treasury.toFixed(3)} TND`, icon: Wallet, color: "text-emerald-500" },
    // { label: "Factures", value: stats.invoices, icon: Receipt, color: "text-amber-500" },
    { label: "Paiements en attente", value: `${stats.pendingPayments.toFixed(3)} TND`, icon: AlertCircle, color: "text-red-500" },
    { label: "Commandes livrées", value: stats.deliveredOrders, icon: Truck, color: "text-green-500" },
    // { label: "Factures impayées", value: stats.outstandingInvoices, icon: Receipt, color: "text-orange-500" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Revenus par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `${v.toFixed(3)} TND`} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Statut des factures</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Aucune donnée</p>
            )}
          </CardContent>
        </Card> */}
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">🏆 Produits les plus vendus</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(p.count / topProducts[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{p.count} vendus</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">Aucune vente enregistrée</p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
