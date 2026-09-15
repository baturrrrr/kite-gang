import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, GraduationCap, Users, Wallet } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { formatTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { getInstructorBalance, getInstructorMonth } from "@/lib/instructor-performance-data";

function parseMonth(value?: string): Date {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return startOfMonth(new Date());
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

export default async function PerformansimPage({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string }>;
}) {
  const user = await requireAuth();
  if (user.role !== "INSTRUCTOR" || !user.instructorId) redirect("/dashboard");
  const instructorId = user.instructorId;

  const params = await searchParams;
  const monthStart = parseMonth(params.ay);
  const isCurrentMonth = format(monthStart, "yyyy-MM") === format(new Date(), "yyyy-MM");

  const rates = await getExchangeRates();
  const [month, balance, payouts] = await Promise.all([
    getInstructorMonth(instructorId, monthStart, rates),
    getInstructorBalance(instructorId, rates),
    prisma.instructorPayout.findMany({ where: { instructorId }, orderBy: { paidAt: "desc" }, take: 10 }),
  ]);
  const money = (amountTRY: number) => formatTRY(amountTRY, "TRY", rates);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performansım</h1>
          <p className="text-gray-500 text-sm mt-1">Tamamlanan derslerin ve hakedişlerin</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/performansim?ay=${format(subMonths(monthStart, 1), "yyyy-MM")}`}
            className="border rounded-md p-1.5 hover:bg-gray-50"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="border rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 capitalize min-w-[140px] text-center">
            {format(monthStart, "MMMM yyyy", { locale: tr })}
          </span>
          {isCurrentMonth ? (
            <span className="border rounded-md p-1.5 text-gray-300" aria-hidden>
              <ChevronRight className="w-4 h-4" />
            </span>
          ) : (
            <Link
              href={`/dashboard/performansim?ay=${format(addMonths(monthStart, 1), "yyyy-MM")}`}
              className="border rounded-md p-1.5 hover:bg-gray-50"
              aria-label="Sonraki ay"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Ay özeti */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <GraduationCap className="w-3.5 h-3.5" /> Ders
            </div>
            <p className="text-2xl font-bold text-gray-900">{month.sessionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" /> Toplam Saat
            </div>
            <p className="text-2xl font-bold text-gray-900">{month.totalHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Öğrenci
            </div>
            <p className="text-2xl font-bold text-gray-900">{month.studentCount}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-green-700 text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Bu Ay Hakediş
            </div>
            <p className="text-2xl font-bold text-green-700">{month.earnedTRY > 0 ? money(month.earnedTRY) : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bakiye */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">Hakediş Bakiyem (tüm zamanlar)</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Hak Edilen</p>
              <p className="text-xl font-bold text-gray-900">{money(balance.earnedTRY)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ödenen</p>
              <p className="text-xl font-bold text-gray-900">{money(balance.paidTRY)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bekleyen</p>
              <p className={`text-xl font-bold ${balance.pendingTRY > 0 ? "text-orange-600" : "text-gray-900"}`}>
                {money(balance.pendingTRY)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ders geçmişi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ders Geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {month.rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Bu ay tamamlanan ders yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tarih</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Öğrenci</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ders</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Süre</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Hakediş</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {month.rows.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {format(row.date, "d MMM yyyy", { locale: tr })}
                        <div className="text-xs">{format(row.date, "HH:mm")}</div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{row.studentName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.title}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{row.hours ? `${row.hours} saat` : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                        {row.earnedTRY !== null ? money(row.earnedTRY) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ödeme geçmişi */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ödeme Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {payouts.map((payout) => (
                <div key={payout.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{formatTRY(payout.amount, payout.currency, rates)}</p>
                    <p className="text-xs text-gray-500">{format(payout.paidAt, "d MMM yyyy", { locale: tr })}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {PAYMENT_METHODS[payout.method as keyof typeof PAYMENT_METHODS] ?? payout.method}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
