"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const DURUM_OPTIONS = [
  { value: "tumu", label: "Tümü" },
  { value: "devam", label: "Devam Ediyor" },
  { value: "tamamlandi", label: "Tamamlandı" },
];

export function DerslerFilters({ q, durum }: { q: string; durum: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(q);

  const pushParams = useCallback(
    (next: { q?: string; durum?: string }) => {
      const merged = { q, durum, ...next };
      const sp = new URLSearchParams();
      if (merged.q) sp.set("q", merged.q);
      if (merged.durum && merged.durum !== "tumu") sp.set("durum", merged.durum);
      const qs = sp.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [q, durum, pathname, router]
  );

  useEffect(() => {
    if (searchValue === q) return;
    const handle = setTimeout(() => pushParams({ q: searchValue }), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="flex gap-3 flex-wrap items-center justify-between">
      <div className="relative flex-1 min-w-48 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Öğrenci veya eğitmen ara"
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Durum</span>
        <select
          value={durum}
          onChange={(e) => pushParams({ durum: e.target.value })}
          className="border rounded-md px-2.5 py-1.5 text-sm bg-card font-medium text-foreground/85"
        >
          {DURUM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
