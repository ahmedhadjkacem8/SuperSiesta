import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardCard } from "./DashboardCard";
import { getImageUrl } from "@/utils/imageUtils";

interface RangePerformanceProps {
  ranges: Array<{ name: string; revenue: number; image: string | null }>;
  loading: boolean;
}

const colors = ["#2563eb", "#10b981", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

export function RangePerformance({ ranges, loading }: RangePerformanceProps) {
  const chartData = ranges.map((item, index) => ({ ...item, fill: colors[index % colors.length] }));
  return (
    <DashboardCard
      title="Performance par gamme"
      loading={loading}
      empty={!loading && chartData.length === 0}
      emptyMessage="Donnée non disponible"
      className="md:col-span-2 xl:col-span-1"
    >
      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis hide />
            <Tooltip formatter={(value: number) => [`${value.toLocaleString("fr-FR")} DT`, "CA"]} />
            <Bar dataKey="revenue" radius={[5, 5, 0, 0]} maxBarSize={38}>
              {chartData.map((item) => <Cell key={item.name} fill={item.fill} />)}
              <LabelList dataKey="revenue" position="top" formatter={(value: number) => `${(value / 1000).toFixed(1)}k`} className="fill-slate-600 text-[10px]" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-around">
        {chartData.map((item) => (
          <div key={item.name} className="flex flex-col items-center gap-1">
            {item.image ? <img src={getImageUrl(item.image)} alt="" className="h-7 w-7 rounded-full border border-white object-cover shadow-sm" /> : <span className="h-7 w-7 rounded-full bg-slate-100" />}
            <span className="max-w-16 truncate text-[10px] text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
