import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  action?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}

export function DashboardCard({
  title,
  children,
  className = "",
  contentClassName = "",
  action,
  loading = false,
  empty = false,
  emptyMessage = "Aucune donnée sur cette période",
}: DashboardCardProps) {
  return (
    <Card className={cn("flex h-full flex-col rounded-2xl border-slate-200/80 bg-white shadow-[0_4px_20px_-14px_rgba(15,23,42,0.24)]", className)}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 px-5 pb-3 pt-5">
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn("px-5 pb-5", contentClassName)}>
        {loading ? (
          <div className="space-y-3 py-2" aria-label="Chargement">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : empty ? (
          <div className="flex min-h-32 items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}
