import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, LESSON_TYPES, CURRENCY_SYMBOLS } from "@/lib/constants";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { ExportButton } from "./export-button";

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const fromDate = params.from ? new Date(params.from) : startOfMonth(new Date());
  const toDate = params.to ? new Date(params.to) : endOfMonth(new Date());
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  const [payments, expenses, instructorEarnings, instructorPayouts, lessons, packagePurchases] = await Promise.all([
    prisma.payment.findMany({
      where: {
        direction: "INCOMING",
        recordedAt: { gte: fromDate, lte: toDate },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        purchase: { include: { package: true } },
      },
    }),
    prisma.expense.findMany({
      where: {
        isActive: true,
        expenseDate: { gte: fromDate, lte: toDate },
      },
    }),
    prisma.instructorEarning.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        instructor: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.instructorPayout.findMany({
      where: {
        paidAt: { gte: fromDate, lte: toDate },
      },
      include: {
        instructor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.lesson.findMany({
      where: {
        checkInTime: { gte: fromDate, lte: toDate },
        checkOutTime: { not: null },
      },
      include: {
        instructor: { include: { user: { select: { name: true } } } },
        student: { select: { firstName: true, lastName: true } },
      },
    }),
    // Pending receivables
    prisma.packagePurchase.findMany({
      where: { isActive: true },
      include: { payments: true, student: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  // Income by currency
  const incomeByCurrency: Record<string, number> = {};
  for (const p of payments) {
    incomeByCurrency[p.currency] = (incomeByCurrency[p.currency] ?? 0) + p.amount;
  }

  // Income by payment method
  const incomeByMethod: Record<string, number> = {};
  for (const p of payments) {
    const key = `${p.method}-${p.currency}`;
    incomeByMethod[key] = (incomeByMethod[key] ?? 0) + p.amount;
  }

  // Expenses by category
  const expenseByCategory: Record<string, Record<string, number>> = {};
  let totalExpenses: Record<string, number> = {};
  for (const e of expenses) {
    if (!expenseByCategory[e.category]) expenseByCategory[e.category] = {};
    expenseByCategory[e.category][e.currency] = (expenseByCategory[e.category][e.currency] ?? 0) + e.amount;
    totalExpenses[e.currency] = (totalExpenses[e.currency] ?? 0) + e.amount;
  }

  // Instructor earnings
  const earningsByInstructor: Record<string, { name: string; hours: number; earned: Record<string, number>; paid: Record<string, number> }> = {};
  for (const e of instructorEarnings) {
    const name = e.instructor.user.name;
    if (!earningsByInstructor[e.instructorId]) {
      earningsByInstructor[e.instructorId] = { name, hours: 0, earned: {}, paid: {} };
    }
    earningsByInstructor[e.instructorId].hours += e.hours;
    earningsByInstructor[e.instructorId].earned[e.currency] =
      (earningsByInstructor[e.instructorId].earned[e.currency] ?? 0) + e.amount;
    if (e.isPaid) {
      earningsByInstructor[e.instructorId].paid[e.currency] =
        (earningsByInstructor[e.instructorId].paid[e.currency] ?? 0) + e.amount;
    }
  }

  // Instructor payouts by instructor
  const payoutsByInstructor: Record<string, { name: string; amount: Record<string, number> }> = {};
  for (const p of instructorPayouts) {
    const name = p.instructor.user.name;
    if (!payoutsByInstructor[p.instructorId]) {
      payoutsByInstructor[p.instructorId] = { name, amount: {} };
    }
    payoutsByInstructor[p.instructorId].amount[p.currency] =
      (payoutsByInstructor[p.instructorId].amount[p.currency] ?? 0) + p.amount;
  }

  // Pending receivables
  const receivables = packagePurchases
    .map((pp) => {
      const paid = pp.payments.reduce((sum, p) => sum + p.amount, 0);
      const owed = pp.purchasePrice - paid;
      return { ...pp, owed };
    })
    .filter((pp) => pp.owed > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <div className="flex items-center gap-2">
          <ExportButton />
        </div>
      </div>

      {/* Date Filter */}
      <form className="flex gap-3 items-center flex-wrap bg-white border rounded-lg p-3">
        <label className="text-sm font-medium text-gray-700">Tarih Aralığı:</label>
        <input
          type="date"
          name="from"
          defaultValue={format(fromDate, "yyyy-MM-dd")}
          className="border rounded-md px-3 py-1.5 text-sm"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          name="to"
          defaultValue={format(toDate, "yyyy-MM-dd")}
          className="border rounded-md px-3 py-1.5 text-sm"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm">
          Filtrele
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-700">Gelir Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(incomeByCurrency).length === 0 ? (
              <p className="text-sm text-gray-400">Bu dönemde gelir yok</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(incomeByCurrency).map(([currency, amount]) => (
                  <div key={currency} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Toplam ({currency})</span>
                    <span className="font-bold text-green-600">{formatMoney(amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-700">Gider Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(totalExpenses).length === 0 ? (
              <p className="text-sm text-gray-400">Bu dönemde gider yok</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(totalExpenses).map(([currency, amount]) => (
                  <div key={currency} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Toplam ({currency})</span>
                    <span className="font-bold text-red-600">-{formatMoney(amount, currency)}</span>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t space-y-1">
                  {Object.entries(expenseByCategory).map(([cat, byCurrency]) => (
                    <div key={cat} className="flex justify-between items-center text-xs text-gray-500">
                      <span>{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]}</span>
                      <span>{Object.entries(byCurrency).map(([c, a]) => formatMoney(a, c)).join(" + ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructor Earnings Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eğitmen Hakedişleri</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(earningsByInstructor).length === 0 ? (
              <p className="text-sm text-gray-400">Bu dönemde hakediş yok</p>
            ) : (
              <div className="divide-y">
                {Object.values(earningsByInstructor).map((e, i) => {
                  const currencies = Array.from(new Set([...Object.keys(e.earned), ...Object.keys(e.paid)]));
                  return (
                    <div key={i} className="py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-gray-500">{e.hours.toFixed(1)} saat</p>
                        </div>
                        <div className="text-right">
                          {currencies.map((c) => {
                            const earned = e.earned[c] ?? 0;
                            const paid = e.paid[c] ?? 0;
                            const remaining = earned - paid;
                            return (
                              <div key={c}>
                                <p className="text-sm font-semibold text-orange-600">{formatMoney(earned, c)}</p>
                                {paid > 0 && <p className="text-xs text-green-600">Ödendi: {formatMoney(paid, c)}</p>}
                                {remaining > 0 && <p className="text-xs text-red-500">Kalan: {formatMoney(remaining, c)}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructor Payouts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-blue-700">Eğitmen Ödemeleri</CardTitle>
          </CardHeader>
          <CardContent>
            {instructorPayouts.length === 0 ? (
              <p className="text-sm text-gray-400">Bu dönemde eğitmen ödemesi yok</p>
            ) : (
              <div className="divide-y">
                {instructorPayouts.map((p) => (
                  <div key={p.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{p.instructor.user.name}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(p.paidAt), "d MMM yyyy", { locale: tr })}
                        {p.notes && ` · ${p.notes}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatMoney(p.amount, p.currency)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t">
                  {(() => {
                    const totals = instructorPayouts.reduce((acc: Record<string, number>, p) => {
                      acc[p.currency] = (acc[p.currency] ?? 0) + p.amount;
                      return acc;
                    }, {});
                    return Object.entries(totals).map(([c, a]) => (
                      <div key={c} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Toplam ödenen ({c})</span>
                        <span className="text-xs font-semibold text-blue-700">{formatMoney(a, c)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Receivables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-orange-700">Bekleyen Alacaklar</CardTitle>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <p className="text-sm text-gray-400">Bekleyen alacak yok 🎉</p>
            ) : (
              <div className="divide-y">
                {receivables.map((pp) => (
                  <div key={pp.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {pp.student.firstName} {pp.student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(pp.purchasedAt), "d MMM", { locale: tr })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {formatMoney(pp.owed, pp.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lessons by Instructor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ders İstatistikleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-600">Eğitmen</th>
                    <th className="text-right py-2 font-medium text-gray-600">Ders Sayısı</th>
                    <th className="text-right py-2 font-medium text-gray-600">Toplam Saat</th>
                    <th className="text-right py-2 font-medium text-gray-600">Öğrenci</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    const byInstructor: Record<string, { name: string; count: number; hours: number; students: Set<string> }> = {};
                    for (const l of lessons) {
                      const name = l.instructor.user.name;
                      if (!byInstructor[l.instructorId]) {
                        byInstructor[l.instructorId] = { name, count: 0, hours: 0, students: new Set() };
                      }
                      byInstructor[l.instructorId].count++;
                      byInstructor[l.instructorId].hours += l.actualHours ?? 0;
                      byInstructor[l.instructorId].students.add(l.studentId);
                    }
                    return Object.values(byInstructor).map((e, i) => (
                      <tr key={i}>
                        <td className="py-2">{e.name}</td>
                        <td className="py-2 text-right">{e.count}</td>
                        <td className="py-2 text-right">{e.hours.toFixed(1)}h</td>
                        <td className="py-2 text-right">{e.students.size}</td>
                      </tr>
                    ));
                  })()}
                  {lessons.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        Bu dönemde tamamlanmış ders yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
