import { useState } from "react";
import { motion } from "framer-motion";
import { Ban, Banknote, CreditCard, ShoppingCart, Star, Truck } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { AverageBasketCard } from "@/components/admin/dashboard/AverageBasketCard";
import { ClientsCard } from "@/components/admin/dashboard/ClientsCard";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { OrdersDonut } from "@/components/admin/dashboard/OrdersDonut";
import { RangePerformance } from "@/components/admin/dashboard/RangePerformance";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { SalesByRegion } from "@/components/admin/dashboard/SalesByRegion";
import { TopProductsTable } from "@/components/admin/dashboard/TopProductsTable";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatPrice } from "@/lib/utils";
import type { DashboardRange } from "@/components/admin/dashboard/types";

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initialRange(): DashboardRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { preset: "7days", start: localDateKey(start), end: localDateKey(end) };
}

function amount(value: number): string {
  return value ? formatPrice(value, "DT") : "0 DT";
}

export default function AdminDashboard() {
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const data = useDashboardData(range);
  const total = data.totals.orders;
  const deliveryRate = total ? (data.totals.delivered / total) * 100 : 0;
  const cancellationRate = total ? (data.totals.cancelled / total) * 100 : 0;

  const cards = [
    {
      label: "Chiffre d'affaires",
      value: amount(data.totals.revenue),
      detail: "vs période précédente",
      icon: Banknote,
      iconClass: "bg-emerald-50 text-emerald-600",
      trend: data.trends.revenue,
    },
    {
      label: "Commandes",
      value: String(total),
      detail: "vs période précédente",
      icon: ShoppingCart,
      iconClass: "bg-blue-50 text-blue-600",
      trend: data.trends.orders,
    },
    {
      label: "Paiement en attente",
      value: amount(data.totals.pendingPayments),
      detail: "vs période précédente",
      icon: CreditCard,
      iconClass: "bg-violet-50 text-violet-600",
      trend: data.trends.pendingPayments,
    },
    {
      label: "Livraisons",
      value: String(data.totals.delivered),
      detail: "vs période précédente",
      secondary: `Taux de livraison ${deliveryRate.toFixed(1)}%`,
      icon: Truck,
      iconClass: "bg-cyan-50 text-cyan-600",
      trend: data.trends.delivered,
    },
    {
      label: "Annulations",
      value: String(data.totals.cancelled),
      detail: "vs période précédente",
      secondary: `Taux d'annulation ${cancellationRate.toFixed(1)}%`,
      icon: Ban,
      iconClass: "bg-orange-50 text-orange-600",
      trend: data.trends.cancelled,
    },
    {
      label: "Avis clients",
      value: data.totals.averageRating !== null
        ? `${data.totals.averageRating.toFixed(1)}/5`
        : data.totals.overallAverageRating !== null
          ? `${data.totals.overallAverageRating.toFixed(1)}/5`
          : "Aucun avis",
      detail: data.totals.reviewCount !== null && data.totals.reviewCount > 0
        ? `${data.totals.reviewCount} avis sur la période`
        : data.totals.overallReviewCount !== null && data.totals.overallReviewCount > 0
          ? `Aucun avis sur la période · ${data.totals.overallReviewCount} publiés au total`
          : data.totals.overallAverageRating !== null
            ? "Aucun avis sur la période · total indisponible"
            : data.totals.overallReviewCount === 0
              ? "Aucun avis publié"
              : "Données des avis indisponibles",
      icon: Star,
      iconClass: "bg-amber-50 text-amber-500",
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-6 bg-slate-50/40 p-1 sm:gap-7 sm:p-2">
        <DashboardHeader range={range} onRangeChange={setRange} />
        {data.error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Les statistiques n'ont pas pu être actualisées : {data.error}
          </div>
        )}
        <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          {cards.map((card, index) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <KpiCard {...card} loading={data.loading} />
            </motion.div>
          ))}
        </section>

        <section aria-label="Commandes et chiffre d'affaires" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RevenueChart data={data.series} loading={data.loading} />
          <OrdersDonut
            total={total}
            delivered={data.totals.delivered}
            cancelled={data.totals.cancelled}
            pending={data.totals.pending}
            processing={data.totals.processing}
            loading={data.loading}
          />
        </section>

        <section aria-label="Produits et gammes" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
          <TopProductsTable products={data.topProducts} loading={data.loading} />
          <RangePerformance ranges={data.ranges} loading={data.loading} />
        </section>

        <section aria-label="Ventes par ville et indicateurs clients" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SalesByRegion regions={data.regions} total={total} loading={data.loading} />
          <div className="grid grid-cols-1 gap-4 xl:h-[560px] xl:grid-rows-2">
            <ClientsCard
              total={data.totals.clients}
              newClients={data.totals.newClients}
              returningClients={data.totals.returningClients}
              clientTrend={data.trends.clients}
              newClientTrend={data.trends.newClients}
              series={data.series}
              loading={data.loading}
            />
            <AverageBasketCard
              value={data.totals.averageBasket}
              trend={data.trends.averageBasket}
              series={data.series}
              loading={data.loading}
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
