import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import type { SeriesPoint, Trend } from "./types";
import { formatPrice } from "@/lib/utils";

interface AverageBasketCardProps {
  value: number;
  trend: Trend;
  series: SeriesPoint[];
  loading: boolean;
}

export function AverageBasketCard({ value, trend, series, loading }: AverageBasketCardProps) {
  return (
    <DashboardCard title="Panier moyen" loading={loading}>
      <p className="text-3xl font-bold tracking-tight text-slate-950">{formatPrice(value, "DT")}</p>
      <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}>
        {trend.positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        {trend.value.toFixed(1)}% <span className="font-normal text-muted-foreground">vs période précédente</span>
      </p>
      {series.length > 0 ? (
        <div className="mt-4 h-[120px] xl:h-[132px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
              <defs><linearGradient id="basketTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 9 }} minTickGap={20} />
              <Tooltip formatter={(amount: number) => [amount === 0 ? "0 DT" : formatPrice(amount, "DT"), "Panier moyen"]} />
              <Area dataKey="averageBasket" type="monotone" stroke="#10b981" strokeWidth={2} fill="url(#basketTrendFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="mt-6 text-center text-xs text-muted-foreground">Aucune vente livrée sur cette période</p>}
    </DashboardCard>
  );
}
