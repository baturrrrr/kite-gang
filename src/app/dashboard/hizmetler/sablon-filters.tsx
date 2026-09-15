"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const AKTIF_OPTIONS = [
  { value: "aktif", label: "Aktif" },
  { value: "pasif", label: "Pasif" },
  { value: "tumu", label: "Tümü" },
];

const GORUNURLUK_OPTIONS = [
  { value: "tumu", label: "Tümü" },
  { value: "LISTED", label: "Online listelenir" },
  { value: "PARTNER_ONLY", label: "Yalnızca Partner Paneli" },
  { value: "HIDDEN", label: "Gizli" },
];

export function SablonFilters({
  q,
  aktif,
  gorunurluk,
  searchPlaceholder,
}: {
  q: string;
  aktif: string;
  gorunurluk: string;
  searchPlaceholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(q);

  const pushParams = useCallback(
    (next: { q?: string; aktif?: string; gorunurluk?: string }) => {
      const merged = { q, aktif, gorunurluk, ...next };
      const sp = new URLSearchParams();
      if (merged.q) sp.set("q", merged.q);
      if (merged.aktif && merged.aktif !== "aktif") sp.set("aktif", merged.aktif);
      if (merged.gorunurluk && merged.gorunurluk !== "tumu") sp.set("gorunurluk", merged.gorunurluk);
      const qs = sp.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [q, aktif, gorunurluk, pathname, router]
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
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Kayıtlar</span>
          <select
            value={aktif}
            onChange={(e) => pushParams({ aktif: e.target.value })}
            className="border rounded-md px-2.5 py-1.5 text-sm bg-card font-medium text-foreground/85"
          >
            {AKTIF_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Görünürlük</span>
          <select
            value={gorunurluk}
            onChange={(e) => pushParams({ gorunurluk: e.target.value })}
            className="border rounded-md px-2.5 py-1.5 text-sm bg-card font-medium text-foreground/85"
          >
            {GORUNURLUK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
