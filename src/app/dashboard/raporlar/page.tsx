import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, LESSON_TYPES } from "@/lib/constants";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { ExportButton } from "./export-button";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

function formatMoney(amount: number, currency: string) {
  return formatCurrency(amount, currency);
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

  // Özet toplamlar güncel kur ile TRY'ye çevrilip tek bir rakamda gösterilir;
  // tekil işlem/satır tutarları kendi orijinal para biriminde kalır.
  const rates = await getExchangeRates();
  const toTRY = (amount: number, currency: string) => convertAmount(amount, currency, "TRY", rates);

  const incomeTRY = payments.reduce((sum, p) => sum + toTRY(p.amount, p.currency), 0);

  // Expenses by category (TRY)
  const expenseByCategoryTRY: Record<string, number> = {};
  for (const e of expenses) {
    expenseByCategoryTRY[e.category] = (expenseByCategoryTRY[e.category] ?? 0) + toTRY(e.amount, e.currency);
  }
  const totalExpensesTRY = expenses.reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0);

  // Instructor earnings (TRY)
  const earningsByInstructor: Record<string, { name: string; hours: number; earnedTRY: number; paidTRY: number }> = {};
  for (const e of instructorEarnings) {
    const name = e.instructor.user.name;
    if (!earningsByInstructor[e.instructorId]) {
      earningsByInstructor[e.instructorId] = { name, hours: 0, earnedTRY: 0, paidTRY: 0 };
    }
    const amountTRY = toTRY(e.amount, e.currency);
    earningsByInstructor[e.instructorId].hours += e.hours;
    earningsByInstructor[e.instructorId].earnedTRY += amountTRY;
    if (e.isPaid) {
      earningsByInstructor[e.instructorId].paidTRY += amountTRY;
    }
  }

  const totalPayoutsTRY = instructorPayouts.reduce((sum, p) => sum + toTRY(p.amount, p.currency), 0);

  // Pending receivables
  const receivables = packagePurchases
    .map((pp) => {
      // Ödemeler paketten farklı para biriminde alınmış olabilir.
      const paid = pp.payments.reduce((sum, p) => sum + convertAmount(p.amount, p.currency, pp.currency, rates), 0);
      const owed = pp.purchasePrice - paid;
      return { ...pp, owed };
    })
    .filter((pp) => pp.owed > 0.01);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-4xl leading-[0.95] font-extrabold lg:text-[56px]">Raporlar</h1>
        <div className="flex items-center gap-2">
          <ExportButton />
        </div>
      </div>

      {/* Date Filter */}
      <form className="flex gap-3 items-center flex-wrap bg-card border rounded-lg p-3">
        <label className="text-sm font-medium text-foreground/85">Tarih Aralığı:</label>
        <input
          type="date"
          name="from"
          defaultValue={format(fromDate, "yyyy-MM-dd")}
          className="border rounded-md px-3 py-1.5 text-sm"
        />
        <span className="text-muted-foreground/70">—</span>
        <input
          type="date"
          name="to"
          defaultValue={format(toDate, "yyyy-MM-dd")}
          className="border rounded-md px-3 py-1.5 text-sm"
        />
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          Filtrele
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-success">Gelir Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">Bu dönemde gelir yok</p>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Toplam (TRY)</span>
                <span className="font-bold text-success">{formatMoney(incomeTRY, "TRY")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Gider Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">Bu dönemde gider yok</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Toplam (TRY)</span>
                  <span className="font-bold text-destructive">-{formatMoney(totalExpensesTRY, "TRY")}</span>
                </div>
                <div className="mt-3 pt-3 border-t space-y-1">
                  {Object.entries(expenseByCategoryTRY).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]}</span>
                      <span>{formatMoney(amount, "TRY")}</span>
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
              <p className="text-sm text-muted-foreground/70">Bu dönemde hakediş yok</p>
            ) : (
              <div className="divide-y">
                {Object.values(earningsByInstructor).map((e, i) => {
                  const remaining = e.earnedTRY - e.paidTRY;
                  return (
                    <div key={i} className="py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.hours.toFixed(1)} saat</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-warning">{formatMoney(e.earnedTRY, "TRY")}</p>
                          {e.paidTRY > 0 && <p className="text-xs text-success">Ödendi: {formatMoney(e.paidTRY, "TRY")}</p>}
                          {remaining > 0 && <p className="text-xs text-destructive">Kalan: {formatMoney(remaining, "TRY")}</p>}
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
            <CardTitle className="text-base text-info">Eğitmen Ödemeleri</CardTitle>
          </CardHeader>
          <CardContent>
            {instructorPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">Bu dönemde eğitmen ödemesi yok</p>
            ) : (
              <div className="divide-y">
                {instructorPayouts.map((p) => (
                  <div key={p.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{p.instructor.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.paidAt), "d MMM yyyy", { locale: tr })}
                        {p.notes && ` · ${p.notes}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-info">
                      {formatMoney(toTRY(p.amount, p.currency), "TRY")}
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Toplam ödenen (TRY)</span>
                  <span className="text-xs font-semibold text-info">{formatMoney(totalPayoutsTRY, "TRY")}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Receivables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-warning">Bekleyen Alacaklar</CardTitle>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">Bekleyen alacak yok 🎉</p>
            ) : (
              <div className="divide-y">
                {receivables.map((pp) => (
                  <div key={pp.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {pp.student.firstName} {pp.student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pp.purchasedAt), "d MMM", { locale: tr })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-warning">
                      {formatMoney(toTRY(pp.owed, pp.currency), "TRY")}
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
                    <th className="text-left py-2 font-medium text-muted-foreground">Eğitmen</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Ders Sayısı</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Toplam Saat</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Öğrenci</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    const byInstructor: Record<string, { name: string; count: number; hours: number; students: Set<string> }> = {};
                    for (const l of lessons) {
                      if (!l.instructor || !l.instructorId) continue;
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
                      <td colSpan={4} className="py-4 text-center text-muted-foreground/70">
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
