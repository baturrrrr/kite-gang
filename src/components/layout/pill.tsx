import { cn } from "@/lib/utils";

export type PillTone = "success" | "danger" | "warning" | "info" | "neutral";

const TONES: Record<PillTone, string> = {
  success: "bg-success/12 text-success",
  danger: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  neutral: "bg-muted text-foreground/75",
};

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold whitespace-nowrap [&_svg]:size-3",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const RESERVATION: Record<string, { label: string; tone: PillTone }> = {
  PLANNED: { label: "Planlandı", tone: "neutral" },
  CHECKED_IN: { label: "Suda", tone: "info" },
  COMPLETED: { label: "Tamamlandı", tone: "success" },
  CANCELLED: { label: "İptal", tone: "neutral" },
  NO_SHOW: { label: "Gelmedi", tone: "danger" },
  WIND_CANCELLED: { label: "Rüzgar iptali", tone: "warning" },
};

export function ReservationStatusPill({ status, className }: { status: string; className?: string }) {
  const entry = RESERVATION[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Pill tone={entry.tone} className={className}>
      {entry.label}
    </Pill>
  );
}
