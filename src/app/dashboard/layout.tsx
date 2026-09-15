import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={user.role} userName={user.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 max-w-[1400px] mx-auto">
          {rates.source !== "live" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {rates.source === "saved"
                ? `Güncel kur alınamadı. TL karşılıkları ${format(new Date(rates.updatedAt), "d MMM yyyy HH:mm", { locale: tr })} tarihli son kayıtlı kura göre gösteriliyor.`
                : "Kur bilgisi alınamadı. EUR/USD tutarlar TL'ye çevrilemiyor, toplamlar hatalı olabilir. Farklı para birimindeki kasa işlemleri kur gelene kadar engellendi."}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
