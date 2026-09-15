import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav, MobileTopBar } from "@/components/layout/mobile-nav";
import { getExchangeRates } from "@/lib/exchange-rates";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const rates = await getExchangeRates();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={user.role} userName={user.name} />
      <div className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(900px_360px_at_92%_-8%,rgb(215_255_63/0.06),transparent_70%)]">
        <MobileTopBar userRole={user.role} userName={user.name} />
        {/* Alt gezinme çubuğu içeriğin üstüne binmesin diye mobilde altta boşluk */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-28 lg:px-9 lg:pt-8 lg:pb-10">
          {rates.source !== "live" && (
            <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
              {rates.source === "saved"
                ? `Güncel kur alınamadı. TL karşılıkları ${format(new Date(rates.updatedAt), "d MMM yyyy HH:mm", { locale: tr })} tarihli son kayıtlı kura göre gösteriliyor.`
                : "Kur bilgisi alınamadı. EUR/USD tutarlar TL'ye çevrilemiyor, toplamlar hatalı olabilir. Farklı para birimindeki kasa işlemleri kur gelene kadar engellendi."}
            </div>
          )}
          {children}
        </main>
      </div>
      <MobileBottomNav userRole={user.role} />
    </div>
  );
}
