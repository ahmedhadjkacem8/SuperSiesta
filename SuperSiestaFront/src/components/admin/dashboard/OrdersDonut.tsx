import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardCard } from "./DashboardCard";

interface OrdersDonutProps {
  total: number;
  delivered: number;
  cancelled: number;
  pending: number;
  processing: number;
  loading: boolean;
}

const segments = [
  { key: "delivered", label: "Livrées", color: "#10b981" },
  { key: "cancelled", label: "Annulées", color: "#f97316" },
  { key: "pending", label: "En attente", color: "#38bdf8" },
  { key: "processing", label: "En traitement", color: "#8b5cf6" },
] as const;

export function OrdersDonut({ total, delivered, cancelled, pending, processing, loading }: OrdersDonutProps) {
  const values: Record<string, number> = { delivered, cancelled, pending, processing };
  const data = segments.map((segment) => ({ ...segment, value: values[segment.key] }));
  return (
    <DashboardCard title="Répartition des commandes" loading={loading} empty={!loading && total === 0} className="min-w-0">
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6 lg:gap-10">
        <div className="relative h-[210px] w-full max-w-[230px] shrink-0 sm:h-[240px] sm:max-w-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={68} outerRadius={98} paddingAngle={3} stroke="none">
                {data.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} commande${value > 1 ? "s" : ""}`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-3xl font-bold text-slate-900">{total}</strong>
            <span className="text-xs text-muted-foreground">Commandes</span>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4">
          {data.map((item) => {
            const percentage = total ? (item.value / total) * 100 : 0;
            return (
              <div key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-600">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-slate-800">{item.value} <span className="font-normal text-muted-foreground">({percentage.toFixed(0)}%)</span></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardCard>
  );
}
