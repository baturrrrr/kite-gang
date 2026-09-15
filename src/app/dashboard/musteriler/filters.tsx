"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SKILL_LEVELS } from "@/lib/constants";

const DURUM_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "temiz", label: "Borç Yok" },
  { value: "borc", label: "Borç Var" },
];

export function MusterilerFilters({
  q,
  seviye,
  durum,
}: {
  q: string;
  seviye: string;
  durum: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(q);

  const pushParams = useCallback(
    (next: { q?: string; seviye?: string; durum?: string }) => {
      const merged = { q, seviye, durum, ...next };
      const sp = new URLSearchParams();
      if (merged.q) sp.set("q", merged.q);
      if (merged.seviye) sp.set("seviye", merged.seviye);
      if (merged.durum) sp.set("durum", merged.durum);
      const qs = sp.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [q, seviye, durum, pathname, router]
  );

  // Arama kutusu yazarken her tuşta değil, kısa bir gecikmeyle filtrelesin.
  useEffect(() => {
    if (searchValue === q) return;
    const handle = setTimeout(() => pushParams({ q: searchValue }), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Ad, soyad, telefon veya e-posta ara..."
          className="pl-9"
        />
      </div>

      <select
        value={seviye}
        onChange={(e) => pushParams({ seviye: e.target.value })}
        className="border rounded-md px-3 py-2 text-sm bg-card"
      >
        <option value="">Tüm Seviyeler</option>
        {Object.entries(SKILL_LEVELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bakiye Durumu</span>
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {DURUM_OPTIONS.map((opt) => {
            const active = durum === opt.value;
            return (
              <button
                key={opt.value || "tumu"}
                type="button"
                onClick={() => pushParams({ durum: opt.value })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/85"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
