import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, ShoppingCart, TrendingUp } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toTRY, formatTRY, convertAmount, formatTL } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-success/15 text-success border-success/30",
  BANK_TRANSFER: "bg-info/15 text-info border-info/30",
  CREDIT_CARD: "bg-info/15 text-info border-info/30",
  OTHER: "bg-muted text-foreground/85 border-border",
};

export default async function UrunSatislariPage({
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
  const toDate = params.to ? new Date(params.to + "T23:59:59") : new Date(new Date().setHours(23, 59, 59, 999));

  const [sales, rates] = await Promise.all([
    prisma.hizmet.findMany({
      where: {
        category: "URUN",
        isActive: true,
        status: { not: "IPTAL" },
        createdAt: { gte: fromDate, lte: toDate },
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
        payments: { select: { amount: true, currency: true, method: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);

  // Farklı para birimlerindeki satışlar TL'ye çevrilip tek toplamda gösterilir.
  const formatMoney = (amount: number, currency: string) => formatTRY(amount, currency, rates);
  const totalTRY = sales.reduce((sum, s) => sum + toTRY(s.amount, s.currency, rates), 0);

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">{sales.length} satış</p>

      {/* Summary card */}
      {sales.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <Card className="min-w-[160px]">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Toplam Satış
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatTL(totalTRY)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <form className="flex gap-3 flex-wrap items-end">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input name="q" defaultValue={q} placeholder="Müşteri veya ürün ara" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Başlangıç</label>
          <input
            type="date"
            name="from"
            defaultValue={format(fromDate, "yyyy-MM-dd")}
            className="border rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Bitiş</label>
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
          {sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/70">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Bu dönemde ürün satışı bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Müşteri</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ürün</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Adet</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ödeme Yöntemi</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.map((sale) => {
                    const paid = sale.payments.reduce(
                      (s, p) => s + convertAmount(p.amount, p.currency, sale.currency, rates),
                      0
                    );
                    const debt = sale.amount - paid;
                    const primaryPayment = sale.payments[0];
                    const isFullyPaid = debt <= 0.01;

                    return (
                      <tr key={sale.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 text-muted-foreground">
                          <div>{format(new Date(sale.createdAt), "d MMM yyyy", { locale: tr })}</div>
                          <div className="text-xs text-muted-foreground/70">
                            {format(new Date(sale.createdAt), "HH:mm")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {sale.student ? (
                            <>
                              <Link
                                href={`/dashboard/musteriler/${sale.student.id}`}
                                className="font-medium text-foreground hover:text-info"
                              >
                                {sale.student.firstName} {sale.student.lastName}
                              </Link>
                              {sale.student.phone && (
                                <div className="text-xs text-muted-foreground">{sale.student.phone}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/70 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{sale.title}</td>
                        <td className="px-4 py-3 text-right text-foreground/85">{sale.quantity ?? 1}</td>
                        <td className="px-4 py-3">
                          {primaryPayment ? (
                            <Badge
                              variant="outline"
                              className={METHOD_COLORS[primaryPayment.method] ?? ""}
                            >
                              {PAYMENT_METHODS[primaryPayment.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/70 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isFullyPaid ? (
                            <Badge className="bg-success/15 text-success border-success/30" variant="outline">
                              Ödenmiş
                            </Badge>
                          ) : (
                            <div>
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30" variant="outline">
                                Borç Var
                              </Badge>
                              <div className="text-xs text-destructive mt-0.5">
                                -{formatMoney(debt, sale.currency)}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {formatMoney(sale.amount, sale.currency)}
                          {!isFullyPaid && (
                            <div className="text-xs text-muted-foreground/70 font-normal">
                              Ödenen: {formatMoney(paid, sale.currency)}
                            </div>
                          )}
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
