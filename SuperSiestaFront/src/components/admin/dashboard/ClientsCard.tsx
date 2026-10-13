import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { DashboardCard } from "./DashboardCard";
import type { SeriesPoint, Trend } from "./types";

interface ClientsCardProps {
  total: number;
  newClients: number;
  returningClients: number;
  clientTrend: Trend;
  newClientTrend: Trend;
  series: SeriesPoint[];
  loading: boolean;
}

export function ClientsCard({ total, newClients, returningClients, clientTrend, newClientTrend, series, loading }: ClientsCardProps) {
  const returnRate = total ? (returningClients / total) * 100 : 0;
  return (
    <DashboardCard title="Clients" loading={loading} empty={!loading && total === 0}>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-muted-foreground">Total clients</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{total}</p>
          <p className={`text-[10px] font-medium ${clientTrend.positive ? "text-emerald-600" : "text-rose-600"}`}>{clientTrend.positive ? "+" : "−"}{clientTrend.value.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-muted-foreground">Nouveaux</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{newClients}</p>
          <p className={`text-[10px] font-medium ${newClientTrend.positive ? "text-emerald-600" : "text-rose-600"}`}>{newClientTrend.positive ? "+" : "−"}{newClientTrend.value.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-muted-foreground">Récurrents</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{returningClients}</p>
          <p className="text-[10px] font-medium text-muted-foreground">{returnRate.toFixed(1)}% du total</p>
        </div>
      </div>
      {series.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-slate-700">Nouveaux clients</p>
          <div className="h-[88px] xl:h-[96px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 0, left: -30, bottom: 0 }}>
                <defs><linearGradient id="clientTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 9 }} minTickGap={20} />
                <Tooltip formatter={(value: number) => [`${value} client${value > 1 ? "s" : ""}`, "Nouveaux"]} />
                <Area dataKey="newClients" type="monotone" stroke="#8b5cf6" strokeWidth={2} fill="url(#clientTrendFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-muted-foreground">Aucune donnée client sur cette période</p>
      )}
    </DashboardCard>
  );
}
