"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

const PRESETS = [
  { label: "Bugün",    get: () => { const t = fmt(new Date()); return { from: t, to: t }; } },
  { label: "Yarın",    get: () => { const d = new Date(); d.setDate(d.getDate()+1); const t=fmt(d); return{from:t,to:t}; } },
  { label: "Bu Hafta", get: () => { const d=new Date(),m=new Date(d); m.setDate(d.getDate()-((d.getDay()+6)%7)); const s=new Date(m); s.setDate(m.getDate()+6); return{from:fmt(m),to:fmt(s)}; } },
  { label: "7 Gün",    get: () => { const s=new Date(),e=new Date(); e.setDate(e.getDate()+7); return{from:fmt(s),to:fmt(e)}; } },
  { label: "Bu Ay",    get: () => { const n=new Date(); return{from:fmt(new Date(n.getFullYear(),n.getMonth(),1)),to:fmt(new Date(n.getFullYear(),n.getMonth()+1,0))}; } },
];

// key prop ile dış div, from/to değişince tüm formu yeniden mount eder
// Bu sayede defaultValue her zaman güncel olur, state gerekmez
export function DateRangeNav({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  function go(f: string, t: string) {
    router.push(`/dashboard/rezervasyonlar?from=${f}&to=${t}`);
  }

  function handleGoster() {
    const f = fromRef.current?.value || from;
    const t = toRef.current?.value   || to;
    go(f, t);
  }

  return (
    <div key={`${from}__${to}`} className="space-y-4">
      {/* Hızlı seçimler */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const r = p.get();
          const active = r.from === from && r.to === to;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => go(r.from, r.to)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Tarih seçici */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <p className="text-xs text-muted-foreground/70 mb-1">Başlangıç</p>
            <input
              ref={fromRef}
              type="date"
              defaultValue={from}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-border focus:outline-none"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground/70 mb-1">Bitiş</p>
            <input
              ref={toRef}
              type="date"
              defaultValue={to}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-border focus:outline-none"
            />
          </div>
        </div>

        {/* Göster butonu — kendi satırında, hiçbir flex ile çakışmıyor */}
        <Button type="button" onClick={handleGoster} className="px-5">
          Göster
        </Button>
      </div>
    </div>
  );
}
