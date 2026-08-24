import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CURRENCY_SYMBOLS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { NewExpenseForm } from "./new-expense-form";
import { NewAccountForm } from "./new-account-form";
import { NewGelirForm } from "./new-gelir-form";

const METHOD_BADGE: Record<string, string> = {
  CASH: "bg-green-100 text-green-700 border-green-200",
  BANK_TRANSFER: "bg-blue-100 text-blue-700 border-blue-200",
  CREDIT_CARD: "bg-purple-100 text-purple-700 border-purple-200",
  OTHER: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export default async function KasaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const tab = params.tab ?? "kasa";

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [cashAccounts, recentExpenses, recentPayments, monthlyIncome, monthlyExpense] = await Promise.all([
    prisma.cashAccount.findMany({
      where: { isActive: true },
      include: { _count: { select: { entries: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: { isActive: true },
      orderBy: { expenseDate: "desc" },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { direction: "INCOMING" },
      include: { student: { select: { firstName: true, lastName: true } } },
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
    prisma.payment.aggregate({
      where: { direction: "INCOMING", recordedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { isActive: true, expenseDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalByCurrency: Record<string, { cash: number; bank: number }> = {};
  for (const acc of cashAccounts) {
    if (!totalByCurrency[acc.currency]) totalByCurrency[acc.currency] = { cash: 0, bank: 0 };
    if (acc.accountType === "CASH") totalByCurrency[acc.currency].cash += acc.balance;
    else totalByCurrency[acc.currency].bank += acc.balance;
  }

  const thisMonthIncome = monthlyIncome._sum.amount ?? 0;
  const thisMonthExpense = monthlyExpense._sum.amount ?? 0;
  const thisMonthNet = thisMonthIncome - thisMonthExpense;

  // Build combined + indexed transactions list
  const allTransactions = [
    ...recentExpenses.map((e, i) => ({ type: "expense" as const, date: new Date(e.expenseDate), item: e, idx: i })),
    ...recentPayments.map((p, i) => ({ type: "payment" as const, date: new Date(p.recordedAt), item: p, idx: i })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Give sequential display IDs from newest to oldest
  const withIds = allTransactions.map((t, i) => ({ ...t, displayId: allTransactions.length - i }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kasa & Muhasebe</h1>
        <div className="flex gap-2">
          <NewAccountForm />
          <NewGelirForm />
          <NewExpenseForm cashAccounts={cashAccounts} />
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-green-700 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Bu Ay Gelir
            </div>
            <p className="text-2xl font-bold text-green-700">{formatMoney(thisMonthIncome, "EUR")}</p>
            <p className="text-xs text-green-600 mt-0.5">{format(now, "MMMM yyyy", { locale: tr })}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-red-700 text-xs mb-1">
              <TrendingDown className="w-3.5 h-3.5" /> Bu Ay Gider
            </div>
            <p className="text-2xl font-bold text-red-700">{formatMoney(thisMonthExpense, "EUR")}</p>
            <p className="text-xs text-red-600 mt-0.5">{recentExpenses.length} gider kalemi</p>
          </CardContent>
        </Card>
        <Card className={thisMonthNet >= 0 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Net (Bu Ay)
            </div>
            <p className={`text-2xl font-bold ${thisMonthNet >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {thisMonthNet >= 0 ? "+" : ""}{formatMoney(thisMonthNet, "EUR")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Gelir - Gider</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Account Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cashAccounts.map((acc) => (
          <Card key={acc.id} className={acc.balance < 0 ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`w-4 h-4 ${acc.accountType === "CASH" ? "text-green-600" : "text-blue-600"}`} />
                <span className="text-sm font-medium text-gray-700 truncate">{acc.name}</span>
                <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                  {acc.accountType === "CASH" ? "Nakit" : "Banka"}
                </Badge>
              </div>
              <p className={`text-2xl font-bold ${acc.balance < 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatMoney(acc.balance, acc.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
        {cashAccounts.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="text-center py-8 text-gray-400">
              Henüz kasa hesabı oluşturulmadı. Yukarıdan ekleyin.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {[
          { key: "kasa", label: "Tüm İşlemler" },
          { key: "giderler", label: "Giderler" },
          { key: "gelirler", label: "Gelirler" },
        ].map((t) => (
          <a
            key={t.key}
            href={`?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Giderler Tab */}
      {tab === "giderler" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Giderler ({recentExpenses.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 w-12">#</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Tarih</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Kategori</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Açıklama</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Yöntem</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentExpenses.map((exp, i) => (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{recentExpenses.length - i}</td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {format(new Date(exp.expenseDate), "d MMM yyyy", { locale: tr })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">
                          {EXPENSE_CATEGORIES[exp.category as keyof typeof EXPENSE_CATEGORIES]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{exp.description}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs ${METHOD_BADGE[exp.method] ?? ""}`}>
                          {PAYMENT_METHODS[exp.method as keyof typeof PAYMENT_METHODS]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                        -{formatMoney(exp.amount, exp.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gelirler Tab */}
      {tab === "gelirler" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gelirler ({recentPayments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 w-12">#</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Tarih</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Müşteri / Başlık</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Açıklama</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Yöntem</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentPayments.map((pay, i) => (
                    <tr key={pay.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{recentPayments.length - i}</td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {format(new Date(pay.recordedAt), "d MMM yyyy", { locale: tr })}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {pay.student ? `${pay.student.firstName} ${pay.student.lastName}` : "Manuel Gelir"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{pay.description ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs ${METHOD_BADGE[pay.method] ?? ""}`}>
                          {PAYMENT_METHODS[pay.method as keyof typeof PAYMENT_METHODS]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                        +{formatMoney(pay.amount, pay.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Combined transactions */}
      {tab === "kasa" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-12">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tür</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Başlık</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Açıklama</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Yöntem</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {withIds.slice(0, 60).map((entry) => {
                    if (entry.type === "expense") {
                      const e = entry.item as typeof recentExpenses[0];
                      return (
                        <tr key={`e-${e.id}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.displayId}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                            {format(new Date(e.expenseDate), "d MMM yyyy", { locale: tr })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">Gider</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">
                            {EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES]}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{e.description}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={`text-xs ${METHOD_BADGE[e.method] ?? ""}`}>
                              {PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                            -{formatMoney(e.amount, e.currency)}
                          </td>
                        </tr>
                      );
                    } else {
                      const p = entry.item as typeof recentPayments[0];
                      return (
                        <tr key={`p-${p.id}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.displayId}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                            {format(new Date(p.recordedAt), "d MMM yyyy", { locale: tr })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">Gelir</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">
                            {p.student ? `${p.student.firstName} ${p.student.lastName}` : "Manuel Gelir"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{p.description ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={`text-xs ${METHOD_BADGE[p.method] ?? ""}`}>
                              {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                            +{formatMoney(p.amount, p.currency)}
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
