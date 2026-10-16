import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trend } from "./types";

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  iconClass: string;
  trend?: Trend;
  secondary?: string;
  loading?: boolean;
}

export function KpiCard({ label, value, detail, icon: Icon, iconClass, trend, secondary, loading = false }: KpiCardProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-[0_4px_20px_-14px_rgba(15,23,42,0.24)]">
      <CardContent className="p-3 sm:p-5">
        {loading ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl sm:h-11 sm:w-11" />
            <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-6 w-full" /></div>
          </div>
        ) : (
          <div className="flex min-w-0 items-start gap-2 sm:gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${iconClass}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 break-words text-base font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-1 text-[10px] sm:text-[11px]">
                {trend && (
                  <span className={`inline-flex items-center font-semibold ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}>
                    {trend.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {trend.value.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">{detail}</span>
              </div>
              {secondary && <p className="mt-1 truncate text-[10px] text-muted-foreground">{secondary}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
