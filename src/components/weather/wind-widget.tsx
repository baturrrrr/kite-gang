import { Navigation, Wind } from "lucide-react";
import type { WindConditions } from "@/lib/weather";

function suitability(speedKn: number): { label: string; className: string } {
  if (speedKn < 10) return { label: "Zayıf", className: "text-muted-foreground bg-muted" };
  if (speedKn <= 25) return { label: "İdeal", className: "text-success bg-success/15" };
  return { label: "Kuvvetli", className: "text-warning bg-warning/15" };
}

export function WindWidget({ wind }: { wind: WindConditions | null }) {
  if (!wind) {
    return (
      <div className="bg-gradient-to-br from-info/10 to-info/10 rounded-xl border border-info/30 p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center flex-shrink-0">
          <Wind className="w-4 h-4 text-info" />
        </div>
        <p className="text-sm text-info">Rüzgar verisi alınamadı</p>
      </div>
    );
  }

  const { label, className } = suitability(wind.windSpeedKn);

  return (
    <div className="bg-gradient-to-br from-info/10 to-info/10 rounded-xl border border-info/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-info uppercase tracking-wide">Rüzgar</p>
        <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center">
          <Wind className="w-4 h-4 text-info" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl font-heading font-semibold text-info">{Math.round(wind.windSpeedKn)}</p>
        <span className="text-sm text-info">kn</span>
        <Navigation
          className="w-4 h-4 text-info ml-1"
          style={{ transform: `rotate(${wind.windDirectionDeg + 180}deg)` }}
        />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-info/80">
          {wind.windDirectionLabel}&apos;dan · {Math.round(wind.windGustKn)} kn hamle · {Math.round(wind.temperature)}°C
        </p>
      </div>
      <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${className}`}>
        {label}
      </span>
    </div>
  );
}
