"use client";

import { useState } from "react";
import { formatTL } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type RevenuePoint = { key: string; label: string; amount: number };

const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

function niceCeil(value: number) {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const n = value / power;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * power;
}

// Günlük gelir: tek seri, tek renk, çubuk grafik. Bugün ve en yüksek gün tam renkte vurgulanır.
export function RevenueChart({ data, className }: { data: RevenuePoint[]; className?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.amount));
  const top = niceCeil(max);
  const ticks = [0, top / 2, top];
  const peak = max > 0 ? data.findIndex((d) => d.amount === max) : -1;
  const last = data.length - 1;

  return (
    <div className={cn("flex", className)}>
      <div className="relative w-10 shrink-0 lg:w-11" aria-hidden>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="num absolute right-2.5 text-xs text-muted-foreground/70 lg:text-[13px]"
            style={{ bottom: `calc(${(tick / top) * 100}% + 18px)`, transform: "translateY(50%)" }}
          >
            {tick === 0 ? "0" : compact.format(tick)}
          </span>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2" onPointerLeave={() => setActive(null)}>
        <div className="relative flex h-52 items-end gap-[3px] border-b border-input lg:h-[300px] lg:gap-1.5" aria-hidden>
          {ticks.slice(1).map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-dashed border-border"
              style={{ bottom: `${(tick / top) * 100}%` }}
            />
          ))}
          {data.map((point, index) => {
            const height = (point.amount / top) * 100;
            const highlighted = index === last || index === peak;
            const isActive = active === index;
            return (
              <div
                key={point.key}
                className="relative flex h-full flex-1 items-end"
                onPointerEnter={() => setActive(index)}
                onClick={() => setActive(isActive ? null : index)}
              >
                {isActive ? (
                  <div
                    className="absolute left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-center whitespace-nowrap shadow-lg"
                    style={{ bottom: `calc(${height}% + 8px)` }}
                  >
                    <p className="text-[11px] text-muted-foreground">{point.label}</p>
                    <p className="num text-base font-bold">{formatTL(point.amount)}</p>
                  </div>
                ) : (
                  index === peak &&
                  active === null && (
                    <span
                      className="num absolute left-1/2 -translate-x-1/2 text-[15px] font-bold whitespace-nowrap"
                      style={{ bottom: `calc(${height}% + 6px)` }}
                    >
                      {formatTL(point.amount).replace(/,00$/, "")}
                    </span>
                  )
                )}
                <div
                  className={cn(
                    "w-full rounded-t-[4px] transition-colors",
                    isActive || highlighted ? "bg-primary" : "bg-primary/60",
                    point.amount > 0 && "min-h-[2px]"
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px] lg:gap-1.5" aria-hidden>
          {data.map((point, index) => (
            <span key={point.key} className="flex-1 overflow-visible text-[10px] whitespace-nowrap text-muted-foreground/70 lg:text-[11px]">
              {index % 7 === 0 || index === last ? point.label : ""}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Günlük gelir</caption>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{formatTL(point.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
