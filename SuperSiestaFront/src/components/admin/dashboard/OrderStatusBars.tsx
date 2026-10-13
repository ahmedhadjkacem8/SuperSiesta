import { DashboardCard } from "./DashboardCard";

interface OrderStatusBarsProps {
  total: number;
  delivered: number;
  cancelled: number;
  pending: number;
  processing: number;
  loading: boolean;
}

export function OrderStatusBars({ total, delivered, cancelled, pending, processing, loading }: OrderStatusBarsProps) {
  const statuses = [
    { label: "Livrées", count: delivered, color: "bg-emerald-500" },
    { label: "Annulées", count: cancelled, color: "bg-orange-500" },
    { label: "En attente de paiement", count: pending, color: "bg-sky-400" },
    { label: "En traitement", count: processing, color: "bg-violet-500" },
  ];
  return (
    <DashboardCard title="Statut des commandes" loading={loading} empty={!loading && total === 0}>
      <div className="space-y-5">
        {statuses.map((status) => {
          const percentage = total ? (status.count / total) * 100 : 0;
          return (
            <div key={status.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-700">{status.label} <span className="ml-1 font-semibold text-slate-900">{status.count}</span></span>
                <span className="font-medium text-slate-500">{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${status.color}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

