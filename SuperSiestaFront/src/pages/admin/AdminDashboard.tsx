import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, TrendingUp, 
  ShoppingCart, Truck, AlertCircle, Star, 
  Banknote, ArrowUpRight, Package,
  RefreshCw
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ComposedChart, Bar, Line
} from "recharts";
import { api } from "@/lib/apiClient";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    clients: 0, 
    orders: 0, 
    pendingPayments: 0, 
    deliveredOrders: 0, 
    caisse: 0,
    averageRating: 5.0 
  });
  const [revenueData, setRevenueData] = useState<{ label: string; revenue: number }[]>([]);
  const [period, setPeriod] = useState<'current_week' | 'month' | 'year' | 'custom'>('current_week');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [topProducts, setTopProducts] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const load = async (showLoading = true, currentPeriod = period, range = dateRange) => {
    const now = new Date();
    let effectiveRange = { ...range };

    if (currentPeriod === 'current_week') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      effectiveRange = { start: formatDate(monday), end: formatDate(sunday) };
    } else if (currentPeriod === 'month') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      effectiveRange = { start: formatDate(firstDay), end: formatDate(lastDay) };
    } else if (currentPeriod === 'year') {
      const firstDay = new Date(now.getFullYear() - 4, 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      effectiveRange = { start: formatDate(firstDay), end: formatDate(lastDay) };
    }

    if (currentPeriod !== 'custom' && (effectiveRange.start !== range.start || effectiveRange.end !== range.end)) {
      setDateRange(effectiveRange);
    }

    try {
      if (showLoading) setLoading(true);
      const timestamp = Date.now();
      const [
        notesData, 
        clientsData, 
        ordersData, 
        reviewsData
      ] = await Promise.all([
        api.get<any[]>(`/delivery-notes?t=${timestamp}`),
        api.get<any[]>(`/clients?t=${timestamp}`),
        api.get<any[]>(`/orders?t=${timestamp}`),
        api.get<{ average: number }>(`/published-reviews?t=${timestamp}`),
      ]);

      const orders = ordersData || [];
      const notes = notesData || [];

      const safeTotal = (val: any) => {
        const n = parseFloat(String(val).replace(',', '.'));
        return isNaN(n) ? 0 : n;
      };

      // Stats calculations...
      const pendingPayments = orders
        .filter((o: any) => {
          const bl = notes.find((dn: any) => dn.order_id === o.id);
          return o.status === "accepté" && bl && bl.status !== "livrée" && bl.status !== "annulée";
        })
        .reduce((s: number, o: any) => s + safeTotal(o.total), 0);

      const caisse = orders
        .filter((o: any) => notes.some((dn: any) => dn.order_id === o.id && dn.status === "livrée"))
        .reduce((s: number, o: any) => s + safeTotal(o.total), 0);

      const deliveredCount = notes.filter((n: any) => n.status === "livrée").length;

      setStats({
        clients: clientsData?.length || 0,
        orders: orders.length,
        pendingPayments,
        deliveredOrders: deliveredCount,
        caisse,
        averageRating: (reviewsData as any)?.average || 5.0,
      });

      // Revenue grouping by period: Based on orders with BL status 'livrée'
      const dataMap: Record<string, number> = {};
      
      if (effectiveRange.start && effectiveRange.end) {
        const start = new Date(effectiveRange.start);
        const end = new Date(effectiveRange.end);
        end.setHours(23, 59, 59, 999);

        // Pre-fill labels for cleaner display
        if (currentPeriod === 'current_week') {
          ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach(d => dataMap[d] = 0);
        } else if (currentPeriod === 'month') {
          for (let i = 0; i < 12; i++) {
            const m = new Date(now.getFullYear(), i, 1).toLocaleDateString("fr-TN", { month: 'short' });
            dataMap[m] = 0;
          }
        } else if (currentPeriod === 'year') {
          const startYear = start.getFullYear();
          for (let i = 0; i < 5; i++) {
            dataMap[String(startYear + i)] = 0;
          }
        }

        orders.forEach((o: any) => {
          const bl = notes.find((dn: any) => dn.order_id === o.id);
          if (bl && bl.status === 'livrée') {
            const d = new Date(o.created_at);
            if (d >= start && d <= end) {
              let key = "";
              if (currentPeriod === 'current_week') {
                const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                key = dayNames[d.getDay()];
              } else if (currentPeriod === 'month') {
                key = d.toLocaleDateString("fr-TN", { month: 'short' });
              } else if (currentPeriod === 'year') {
                key = String(d.getFullYear());
              } else {
                key = d.toISOString().split('T')[0];
              }
              dataMap[key] = (dataMap[key] || 0) + safeTotal(o.total);
            }
          }
        });
      }

      const processedData = Object.entries(dataMap)
        .sort(([a], [b]) => {
          if (currentPeriod === 'current_week') {
            const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
            return days.indexOf(a) - days.indexOf(b);
          }
          if (currentPeriod === 'month') {
            const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
            const getIdx = (m: string) => months.findIndex(x => m.toLowerCase().startsWith(x.replace('.', '').substring(0, 3)));
            return getIdx(a) - getIdx(b);
          }
          return a.localeCompare(b);
        })
        .map(([key, revenue]) => {
          let label = key;
          if (currentPeriod === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
            const d = new Date(key);
            label = d.toLocaleDateString("fr-TN", { day: '2-digit', month: 'short' });
          }
          return { label, revenue };
        });
        
      setRevenueData(processedData);

      // Top products: All-time (independent of period)
      const productMap: Record<string, number> = {};

      orders.forEach((o: any) => {
        if (o.items) {
          o.items.forEach((it: any) => {
            const name = it.product_name;
            const size = it.size_label;
            const displayName = size ? `${name} (${size})` : name;
            if (name) productMap[displayName] = (productMap[displayName] || 0) + (it.quantity || 1);
          });
        }
      });

      const tops = Object.entries(productMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([name, count]) => ({ name, count }));
      setTopProducts(tops);
    } catch (err: any) {
      console.error("Dashboard load error:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { 
    load();
    const interval = setInterval(() => load(false), 10000);
    return () => clearInterval(interval);
  }, [period, dateRange]);

  const cards = [
    { 
      label: "Caisse", 
      value: formatPrice(stats.caisse), 
      icon: Banknote, 
      color: "from-emerald-500 to-emerald-600",
      description: "Total encaissé (Livré)"
    },
    { 
      label: "En attente", 
      value: formatPrice(stats.pendingPayments), 
      icon: AlertCircle, 
      color: "from-amber-400 to-amber-600",
      description: "Commandes acceptées"
    },
    { 
      label: "Commandes", 
      value: stats.orders, 
      icon: ShoppingCart, 
      color: "from-blue-500 to-blue-600",
      description: "Total commandes"
    },
    { 
      label: "Livraisons", 
      value: stats.deliveredOrders, 
      icon: Truck, 
      color: "from-cyan-500 to-cyan-600",
      description: "Commandes livrées"
    },
    { 
      label: "Clients", 
      value: stats.clients, 
      icon: Users, 
      color: "from-purple-500 to-purple-600",
      description: "Total clients"
    },
    { 
      label: "Avis Clients", 
      value: `${stats.averageRating}/5`, 
      icon: Star, 
      color: "from-yellow-400 to-yellow-600",
      description: "Note moyenne"
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 p-3 md:p-8 max-w-7xl mx-auto min-h-screen">
{/* Minimal Modern KPI Cards */}
<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
  {cards.map((c, i) => {
    const isLongValue = String(c.value).length > 10;

    return (
      <motion.div
        key={c.label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="h-full"
      >
        <Card
          className="
            group
            h-full
            border border-border/50
            bg-background/80
            backdrop-blur-sm
            rounded-xl
            shadow-sm
            hover:shadow-lg
            hover:-translate-y-1
            hover:border-primary/20
            transition-all duration-200
            overflow-hidden
          "
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">

              {/* Icon */}
              <div
                className={`
                  w-9 h-9
                  rounded-lg
                  bg-gradient-to-br ${c.color}
                  flex items-center justify-center
                  shrink-0
                  shadow-sm
                `}
              >
                <c.icon
                  className="
                    w-4 h-4 text-white
                    transition-transform duration-200
                    group-hover:scale-110
                  "
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">

                {/* Label */}
                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.15em]
                    text-muted-foreground
                    truncate
                  "
                >
                  {c.label}
                </p>

                {/* Value */}
                <h3
                  className={`
                    font-bold
                    text-foreground
                    leading-tight
                    break-words
                    whitespace-normal
                    transition-all
                    duration-200
                    ${isLongValue
                      ? "text-xs md:text-sm"
                      : "text-base md:text-lg"}
                  `}
                >
                  {c.value}
                </h3>

              </div>
            </div>
          </CardContent>

          {/* Bottom Hover Line */}
          <div
            className={`
              h-[2px]
              w-0
              group-hover:w-full
              bg-gradient-to-r ${c.color}
              transition-all duration-300
            `}
          />
        </Card>
      </motion.div>
    );
  })}
</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 border shadow-sm overflow-hidden bg-white">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between p-4 md:p-6 pb-2 gap-4 bg-slate-50/50 border-b mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* Custom Date Range Picker */}
                <div className={`flex items-center gap-1.5 bg-white p-1 rounded-lg border shadow-sm transition-all duration-300 ${period !== 'custom' ? 'opacity-40 grayscale pointer-events-none' : 'ring-2 ring-primary/5 border-primary/20'}`}>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                    <span className="text-[8px] font-black uppercase text-slate-400">Du</span>
                    <input 
                      type="date" 
                      className="bg-transparent text-[10px] font-bold outline-none text-slate-700 cursor-pointer"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      disabled={period !== 'custom'}
                    />
                  </div>
                  <div className="w-[1px] h-3 bg-slate-200" />
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                    <span className="text-[8px] font-black uppercase text-slate-400">Au</span>
                    <input 
                      type="date" 
                      className="bg-transparent text-[10px] font-bold outline-none text-slate-700 cursor-pointer"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      disabled={period !== 'custom'}
                    />
                  </div>
                </div>

                {/* Period Selector */}
                <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200/60 shadow-inner">
                  {(['current_week', 'month', 'year', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`relative px-3 py-1.5 text-[9px] font-black tracking-wider rounded-md transition-all duration-300 ${
                        period === p 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                      }`}
                    >
                      {p === 'current_week' ? 'Sem' : p === 'month' ? 'Mois' : p === 'year' ? 'An' : 'Periode'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="h-[400px] w-full mt-4">
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                        tickFormatter={(v) => `${v} DT`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid hsl(var(--border))', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          fontWeight: '700',
                          fontSize: '11px',
                          background: 'hsl(var(--background))'
                        }}
                        formatter={(v: number) => [v === 0 ? "0 DT" : formatPrice(v), "Revenu"]}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#colorBar)" 
                        radius={[6, 6, 0, 0]} 
                        barSize={32}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2, stroke: 'hsl(var(--primary))' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
                    <Package className="w-10 h-10 opacity-20 mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Aucune donnée</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border shadow-sm">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Top Produits
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 opacity-60">Articles les plus vendus (Global)</p>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              {topProducts.length > 0 ? (
                <div className="space-y-6">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="relative">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? 'bg-yellow-100 text-yellow-700' : 
                            i === 1 ? 'bg-slate-100 text-slate-700' : 
                            i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                          }`}>
                            {i + 1}
                          </div>
                          <p className="text-xs font-bold tracking-tight leading-tight pt-1">{p.name}</p>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0 mt-0.5">{p.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Package className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Aucun produit</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
