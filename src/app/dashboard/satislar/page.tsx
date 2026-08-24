import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, ShoppingBag, TrendingUp } from "lucide-react";
import { CURRENCY_SYMBOLS, PAYMENT_METHODS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-green-100 text-green-700 border-green-200",
  BANK_TRANSFER: "bg-blue-100 text-blue-700 border-blue-200",
  CREDIT_CARD: "bg-purple-100 text-purple-700 border-purple-200",
  OTHER: "bg-gray-100 text-gray-700 border-gray-200",
};

export default async function SatislarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  await requireAdminOrReception();
  const params = await searchParams;
  const q = params.q ?? "";

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = params.from ? new Date(params.from) : defaultFrom;
  const toDate = params.to ? new Date(params.to + "T23:59:59") : new Date(today.setHours(23, 59, 59, 999));

  const purchases = await prisma.packagePurchase.findMany({
    where: {
      isActive: true,
      purchasedAt: { gte: fromDate, lte: toDate },
      ...(q
        ? {
            student: {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { phone: { contains: q } },
              ],
            },
          }
        : {}),
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, phone: true } },
      package: { select: { name: true, lessonType: true } },
      payments: { select: { amount: true, method: true, recordedAt: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const totalByCurrency: Record<string, number> = {};
  for (const p of purchases) {
    totalByCurrency[p.currency] = (totalByCurrency[p.currency] ?? 0) + p.purchasePrice;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Satışlar</h1>
          <p className="text-gray-500 text-sm mt-1">{purchases.length} satış</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(totalByCurrency).map(([currency, total]) => (
          <Card key={currency} className="min-w-[160px]">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {currency} Toplam Satış
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatMoney(total, currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap items-end">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input name="q" defaultValue={q} placeholder="Öğrenci adı veya telefon..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Başlangıç</label>
          <input
            type="date"
            name="from"
            defaultValue={format(fromDate, "yyyy-MM-dd")}
            className="border rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Bitiş</label>
          <input
            type="date"
            name="to"
            defaultValue={format(toDate, "yyyy-MM-dd")}
            className="border rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary">Filtrele</Button>
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {purchases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Bu dönemde satış bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Müşteri</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Paket</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ödeme Yöntemi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Tutar</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Kalan Saat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {purchases.map((purchase) => {
                    const paid = purchase.payments.reduce((s, p) => s + p.amount, 0);
                    const debt = purchase.purchasePrice - paid;
                    const primaryPayment = purchase.payments[0];
                    const isFullyPaid = debt <= 0;

                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">
                          <div>{format(new Date(purchase.purchasedAt), "d MMM yyyy", { locale: tr })}</div>
                          <div className="text-xs text-gray-400">
                            {format(new Date(purchase.purchasedAt), "HH:mm")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/musteriler/${purchase.student.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {purchase.student.firstName} {purchase.student.lastName}
                          </Link>
                          {purchase.student.phone && (
                            <div className="text-xs text-gray-500">{purchase.student.phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{purchase.package.name}</div>
                          <div className="text-xs text-gray-500">
                            {purchase.totalHours} saat
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {primaryPayment ? (
                            <Badge
                              variant="outline"
                              className={METHOD_COLORS[primaryPayment.method] ?? ""}
                            >
                              {PAYMENT_METHODS[primaryPayment.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isFullyPaid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
                              Ödenmiş
                            </Badge>
                          ) : (
                            <div>
                              <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
                                Borç Var
                              </Badge>
                              <div className="text-xs text-red-500 mt-0.5">
                                -{formatMoney(debt, purchase.currency)}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatMoney(purchase.purchasePrice, purchase.currency)}
                          {!isFullyPaid && (
                            <div className="text-xs text-gray-400 font-normal">
                              Ödenen: {formatMoney(paid, purchase.currency)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              purchase.remainingHours <= 0
                                ? "text-red-600 font-semibold"
                                : purchase.remainingHours < 2
                                ? "text-orange-500 font-semibold"
                                : "text-gray-700"
                            }
                          >
                            {purchase.remainingHours.toFixed(1)} saat
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
