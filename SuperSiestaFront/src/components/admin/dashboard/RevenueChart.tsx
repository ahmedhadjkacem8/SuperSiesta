import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardCard } from "./DashboardCard";
import type { SeriesPoint } from "./types";
import { formatPrice } from "@/lib/utils";

interface RevenueChartProps {
  data: SeriesPoint[];
  loading: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const [group, setGroup] = useState<"day" | "week" | "month">("day");
  const grouped = new Map<string, SeriesPoint>();
  data.forEach((point) => {
    const [year, month, day] = point.fullDate.split("-").map(Number);
    const bucketDate = new Date(year, month - 1, day);
    if (group === "week") bucketDate.setDate(bucketDate.getDate() - ((bucketDate.getDay() + 6) % 7));
    if (group === "month") bucketDate.setDate(1);
    const key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}-${String(bucketDate.getDate()).padStart(2, "0")}`;
    const label = group === "month"
      ? bucketDate.toLocaleDateString("fr-TN", { month: "short", year: "2-digit" })
      : group === "week"
        ? `Sem. ${bucketDate.toLocaleDateString("fr-TN", { day: "2-digit", month: "short" })}`
        : point.label;
    const aggregate = grouped.get(key) || { label, fullDate: key, revenue: 0, orders: 0, newClients: 0, averageBasket: 0 };
    aggregate.revenue += point.revenue;
    aggregate.orders += point.orders;
    aggregate.newClients += point.newClients;
    grouped.set(key, aggregate);
  });
  const selectedData = Array.from(grouped.values());

  return (
    <DashboardCard
      title="Évolution du chiffre d'affaires"
      loading={loading}
      empty={!loading && selectedData.reduce((sum, point) => sum + point.orders, 0) === 0}
    >
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {(["day", "week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroup(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${group === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {value === "day" ? "Jour" : value === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={selectedData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={18} />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={58}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}k DT`}
            />
            <Tooltip
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as SeriesPoint | undefined;
                if (!item) return "";
                const [year, month, day] = item.fullDate.split("-").map(Number);
                return new Date(year, month - 1, day).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" });
              }}
              formatter={(value: number) => [
                value === 0 ? "0 DT" : formatPrice(value, "DT"),
                "Chiffre d'affaires",
              ]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#dashboardRevenueFill)"
              activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
              dot={{ r: 3, fill: "#2563eb", stroke: "#fff", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}
