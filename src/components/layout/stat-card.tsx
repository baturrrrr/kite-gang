import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "hero" | "success" | "danger" | "warning" | "info";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-foreground",
  hero: "text-primary-foreground",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
  info: "text-info",
};

type Props = {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
};

// KPI kartı. "hero" tonu elektrik yeşili zeminli öne çıkan karttır; sayfada en fazla bir tane olmalı.
export function StatCard({ label, value, sub, icon: Icon, badge, tone = "default", className, children }: Props) {
  const hero = tone === "hero";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 lg:p-[18px]",
        hero ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-bold tracking-[0.14em] uppercase lg:text-[11px]",
            hero ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        {badge ?? (Icon && <Icon className={cn("size-[18px]", hero ? "text-primary-foreground" : "text-muted-foreground/70")} />)}
      </div>
      <div className="flex flex-col gap-1">
        <span className={cn("num text-[32px] leading-none lg:text-[42px]", hero ? "font-extrabold" : "font-bold", VALUE_TONE[tone])}>
          {value}
        </span>
        {sub && (
          <span className={cn("text-xs", hero ? "font-semibold text-primary-foreground/70" : "text-muted-foreground")}>{sub}</span>
        )}
      </div>
      {children}
    </div>
  );
}
