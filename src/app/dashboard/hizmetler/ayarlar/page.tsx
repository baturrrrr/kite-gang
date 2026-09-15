import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves, Timer, ShoppingCart, IdCard, CalendarDays } from "lucide-react";
import Link from "next/link";

const ROWS = [
  { category: "EGITIM" as const, label: "Seanslar", href: "/dashboard/hizmetler/seanslar", icon: Waves },
  { category: "ETKINLIK" as const, label: "Etkinlikler", href: "/dashboard/hizmetler/etkinlikler", icon: CalendarDays },
  { category: "KIRALAMA" as const, label: "Kiralamalar", href: "/dashboard/hizmetler/kiralamalar", icon: Timer },
  { category: "URUN" as const, label: "Ürünler", href: "/dashboard/hizmetler/urunler", icon: ShoppingCart },
  { category: "UYELIK" as const, label: "Üyelikler", href: "/dashboard/hizmetler/uyelikler", icon: IdCard },
];

export default async function HizmetAyarlariPage() {
  await requireAdminOrReception();

  const counts = await Promise.all(
    ROWS.map(async (r) => {
      const [active, passive] = await Promise.all([
        prisma.hizmetSablonu.count({ where: { category: r.category, isActive: true } }),
        prisma.hizmetSablonu.count({ where: { category: r.category, isActive: false } }),
      ]);
      return { ...r, active, passive };
    })
  );

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategori Özeti</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {counts.map((r) => {
              const Icon = r.icon;
              return (
                <Link
                  key={r.category}
                  href={r.href}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm text-foreground">{r.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground/85 font-medium">{r.active}</span> aktif
                    {r.passive > 0 && <span className="text-muted-foreground/70"> · {r.passive} pasif</span>}
                  </p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hakkında</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Her sekmedeki kayıtlar &quot;Kayıtlar&quot; filtresiyle aktif/pasif olarak yönetilebilir.</p>
          <p>Pasife alınan hizmetler müşteri ekranında listelenmez ama geçmiş kayıtları etkilenmez.</p>
        </CardContent>
      </Card>
    </div>
  );
}
