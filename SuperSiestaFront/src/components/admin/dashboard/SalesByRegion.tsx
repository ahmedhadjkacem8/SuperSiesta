import { Eye, EyeOff, MapPin } from "lucide-react";
import { useState } from "react";
import { DashboardCard } from "./DashboardCard";

interface SalesByRegionProps {
  regions: Array<{ name: string; count: number; cancelledCount: number }>;
  total: number;
  loading: boolean;
}

function normalizeCity(city: string): string {
  return city.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

export function SalesByRegion({ regions, total, loading }: SalesByRegionProps) {
  const [showAll, setShowAll] = useState(false);
  const ordered = [...regions].sort((a, b) => b.count - a.count);
  const visible = showAll ? ordered : ordered.slice(0, 5);
  const cancelledTotal = regions.reduce((sum, city) => sum + city.cancelledCount, 0);

  return (
    <DashboardCard
      title="Ventes par ville"
      loading={loading}
      empty={!loading && regions.length === 0}
      emptyMessage="Aucune ville renseignée pour cette période"
      className="h-[500px] xl:h-[560px]"
      contentClassName="flex min-h-0 flex-1 flex-col"
      action={regions.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {showAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showAll ? "Voir moins" : `Voir toutes (${regions.length})`}
        </button>
      ) : undefined}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          Commandes non annulées
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
          Annulées
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {visible.map((city) => {
          const cancelled = Math.min(city.count, city.cancelledCount);
          const kept = Math.max(0, city.count - cancelled);
          const share = total > 0 ? (city.count / total) * 100 : 0;
          const keptWidth = city.count > 0 ? (kept / city.count) * 100 : 0;
          const cancelledWidth = city.count > 0 ? (cancelled / city.count) * 100 : 0;

          return (
            <div key={normalizeCity(city.name)} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-700">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{city.name}</span>
                </span>
                <span className="shrink-0 text-right text-slate-700">
                  <strong>{city.count}</strong>
                  <span className="ml-1 text-muted-foreground">({share.toFixed(0)}%)</span>
                  {cancelled > 0 && <span className="ml-2 font-medium text-orange-600">{cancelled} annulée{cancelled > 1 ? "s" : ""}</span>}
                </span>
              </div>
              <div
                className="flex h-2.5 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${city.name} : ${kept} commandes non annulées et ${cancelled} annulées`}
              >
                {kept > 0 && <span className="h-full bg-blue-500" style={{ width: `${keptWidth}%` }} />}
                {cancelled > 0 && <span className="h-full bg-orange-500" style={{ width: `${cancelledWidth}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 shrink-0 border-t border-slate-100 pt-3 text-xs text-muted-foreground">
        {cancelledTotal} commande{cancelledTotal === 1 ? "" : "s"} annulée{cancelledTotal === 1 ? "" : "s"} sur {total} au total
      </p>
    </DashboardCard>
  );
}
