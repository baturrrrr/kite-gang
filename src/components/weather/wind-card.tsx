import { Navigation, Wind } from "lucide-react";
import type { WindConditions } from "@/lib/weather";
import { Pill, type PillTone } from "@/components/layout/pill";
import { cn } from "@/lib/utils";

const GAUGE_MAX = 35;

export function windSuitability(speedKn: number): { label: string; tone: PillTone } {
  if (speedKn < 10) return { label: "Zayıf", tone: "neutral" };
  if (speedKn <= 25) return { label: "İdeal", tone: "success" };
  return { label: "Kuvvetli", tone: "warning" };
}

export function WindCard({ wind, className }: { wind: WindConditions | null; className?: string }) {
  if (!wind) {
    return (
      <div className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:p-[18px]", className)}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase lg:text-[11px]">Rüzgar</span>
          <Wind className="size-[18px] text-muted-foreground/70" />
        </div>
        <p className="text-sm text-muted-foreground">Rüzgar verisi alınamadı</p>
      </div>
    );
  }

  const suitability = windSuitability(wind.windSpeedKn);
  const marker = Math.min(wind.windSpeedKn, GAUGE_MAX) / GAUGE_MAX;

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:p-[18px]", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase lg:text-[11px]">Rüzgar</span>
        <Pill tone={suitability.tone} className="h-[22px]">
          {suitability.label}
        </Pill>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[32px] leading-none font-bold lg:text-[42px]">{Math.round(wind.windSpeedKn)}</span>
        <span className="font-heading text-sm font-bold text-muted-foreground uppercase lg:text-base">kn</span>
        <Navigation
          className="ml-1 size-4 text-primary"
          style={{ transform: `rotate(${wind.windDirectionDeg + 180}deg)` }}
          aria-label={`Rüzgar yönü ${wind.windDirectionLabel}`}
        />
      </div>
      <div className="space-y-1.5">
        {/* 0–10 zayıf · 10–25 ideal · 25+ kuvvetli */}
        <div className="relative flex h-1.5 gap-[3px]" aria-hidden>
          <span className="flex-[10] rounded-full bg-input" />
          <span className="flex-[15] rounded-full bg-primary/45" />
          <span className="flex-[10] rounded-full bg-input" />
          <span
            className="absolute -top-[3px] h-3 w-2.5 -translate-x-1/2 rounded-[3px] bg-primary shadow-[0_0_0_2px_var(--card)]"
            style={{ left: `${marker * 100}%` }}
          />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {wind.windDirectionLabel} · {Math.round(wind.windGustKn)} kn hamle · {Math.round(wind.temperature)}°C
        </p>
      </div>
    </div>
  );
}
