"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PeriodNav({
  period,
  date,
  label,
}: {
  period: "gunluk" | "haftalik";
  date: string;
  label: string;
}) {
  const router = useRouter();
  const step = period === "gunluk" ? 1 : 7;

  function go(deltaDays: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    const next = d.toISOString().split("T")[0];
    router.push(`/dashboard/performans-ozeti?period=${period}&date=${next}`);
  }

  function goToday() {
    const today = new Date().toISOString().split("T")[0];
    router.push(`/dashboard/performans-ozeti?period=${period}&date=${today}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(-step)}
        className="border rounded-md p-1.5 text-sm hover:bg-muted/40"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={goToday}
        className="border rounded-md px-3 py-1.5 text-sm hover:bg-muted/40 font-medium text-foreground/85 capitalize min-w-[180px] text-center"
      >
        {label}
      </button>
      <button
        onClick={() => go(step)}
        className="border rounded-md p-1.5 text-sm hover:bg-muted/40"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
