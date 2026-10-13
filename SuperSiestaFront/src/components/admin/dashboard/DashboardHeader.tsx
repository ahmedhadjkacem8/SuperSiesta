import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DashboardRange } from "./types";

interface DashboardHeaderProps {
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

const quickRanges = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7days", label: "7 jours" },
  { value: "30days", label: "30 jours" },
  { value: "3months", label: "3 mois" },
  { value: "1year", label: "1 an" },
] as const;

function localKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() - months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function DashboardHeader({ range, onRangeChange }: DashboardHeaderProps) {
  const customRange = range.preset === "custom";
  const choosePreset = (preset: typeof quickRanges[number]["value"]) => {
    const end = new Date();
    const start = new Date(end);
    if (preset === "today") start.setDate(end.getDate());
    if (preset === "7days") start.setDate(end.getDate() - 6);
    if (preset === "30days") start.setDate(end.getDate() - 29);
    if (preset === "3months") start.setTime(subtractMonths(end, 3).getTime());
    if (preset === "1year") start.setTime(subtractMonths(end, 12).getTime());
    onRangeChange({ preset, start: localKey(start), end: localKey(end) });
  };

  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Statistiques globales</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suivez en temps réel les performances de votre boutique</p>
      </div>
      <div className="flex min-w-0 flex-col gap-3 xl:items-end">
        <div className="flex flex-wrap items-center gap-2">
          {quickRanges.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={range.preset === preset.value ? "default" : "ghost"}
              size="sm"
              className={`h-8 rounded-lg px-3 text-xs ${range.preset === preset.value ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-600"}`}
              onClick={() => choosePreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm">
            <Checkbox
              checked={customRange}
              onCheckedChange={(checked) => {
                if (checked) onRangeChange({ ...range, preset: "custom" });
                else choosePreset("7days");
              }}
              aria-label="Activer la période personnalisée"
              className="h-3.5 w-3.5"
            />
            Période personnalisée
          </label>
        </div>
        {customRange ? (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto">
            <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              Du
              <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
                <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
                <input
                  aria-label="Date de début"
                  type="date"
                  value={range.start}
                  max={range.end}
                  onChange={(event) => event.target.value && onRangeChange({ ...range, preset: "custom", start: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              Au
              <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
                <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
                <input
                  aria-label="Date de fin"
                  type="date"
                  value={range.end}
                  min={range.start}
                  max={localKey(new Date())}
                  onChange={(event) => event.target.value && onRangeChange({ ...range, preset: "custom", end: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </span>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2 self-start text-xs text-muted-foreground xl:self-end">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            <span>{dateLabel(range.start)} — {dateLabel(range.end)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
