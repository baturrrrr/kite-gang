import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { convertAmount, formatTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { NewExpenseForm } from "./new-expense-form";
import { NewAccountForm } from "./new-account-form";
import { NewGelirForm } from "./new-gelir-form";

const METHOD_BADGE: Record<string, string> = {
  CASH: "bg-success/15 text-success border-success/30",
  BANK_TRANSFER: "bg-info/15 text-info border-info/30",
  CREDIT_CARD: "bg-info/15 text-info border-info/30",
  OTHER: "bg-muted text-foreground/85 border-border",
};

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

  const [cashAccounts, recentExpenses, recentPayments, recentPayouts, monthlyIncome, monthlyExpense, monthlyPayouts, rates] = await Promise.all([
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
    // Sadece bir kasa hesabından fiilen düşülmüş hakediş ödemeleri — gerçek nakit çıkışı olanlar
    prisma.instructorPayout.findMany({
      where: { cashRegisterEntry: { isNot: null } },
      include: { instructor: { include: { user: { select: { name: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { direction: "INCOMING", recordedAt: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, kasaAmount: true, currency: true },
    }),
    prisma.expense.findMany({
      where: { isActive: true, expenseDate: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, currency: true },
    }),
    prisma.instructorPayout.findMany({
      where: { cashRegisterEntry: { isNot: null }, paidAt: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, currency: true },
    }),
    getExchangeRates(),
  ]);

  // Farklı para birimlerindeki tüm işlem tutarları tutarlılık için TL'ye çevrilerek gösterilir.
  const formatMoney = (amount: number, currency: string) => formatTRY(amount, currency, rates);

  const totalByCurrency: Record<string, { cash: number; bank: number }> = {};
  for (const acc of cashAccounts) {
    if (!totalByCurrency[acc.currency]) totalByCurrency[acc.currency] = { cash: 0, bank: 0 };
    if (acc.accountType === "CASH") totalByCurrency[acc.currency].cash += acc.balance;
    else totalByCurrency[acc.currency].bank += acc.balance;
  }

  // Farklı para birimlerindeki tutarlar güncel kur ile TRY'ye çevrilip toplanır.
  const thisMonthIncome = monthlyIncome.reduce(
    (sum, p) => sum + convertAmount(p.kasaAmount ?? p.amount, p.currency, "TRY", rates),
    0
  );
  const thisMonthExpense =
    monthlyExpense.reduce((sum, e) => sum + convertAmount(e.amount, e.currency, "TRY", rates), 0) +
    monthlyPayouts.reduce((sum, p) => sum + convertAmount(p.amount, p.currency, "TRY", rates), 0);
  const thisMonthExpenseCount = monthlyExpense.length + monthlyPayouts.length;
  const thisMonthNet = thisMonthIncome - thisMonthExpense;

  // Build combined + indexed transactions list
  const allTransactions = [
    ...recentExpenses.map((e, i) => ({ type: "expense" as const, date: new Date(e.expenseDate), item: e, idx: i })),
    ...recentPayments.map((p, i) => ({ type: "payment" as const, date: new Date(p.recordedAt), item: p, idx: i })),
    ...recentPayouts.map((p, i) => ({ type: "payout" as const, date: new Date(p.paidAt), item: p, idx: i })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Give sequential display IDs from newest to oldest
  const withIds = allTransactions.map((t, i) => ({ ...t, displayId: allTransactions.length - i }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kasa & Muhasebe</h1>
        <div className="flex gap-2">
          <NewAccountForm />
          <NewGelirForm cashAccounts={cashAccounts} />
          <NewExpenseForm cashAccounts={cashAccounts} />
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-success text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Bu Ay Gelir
            </div>
            <p className="text-2xl font-bold text-success">{formatMoney(thisMonthIncome, "TRY")}</p>
            <p className="text-xs text-success mt-0.5">{format(now, "MMMM yyyy", { locale: tr })}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-destructive text-xs mb-1">
              <TrendingDown className="w-3.5 h-3.5" /> Bu Ay Gider
            </div>
            <p className="text-2xl font-bold text-destructive">{formatMoney(thisMonthExpense, "TRY")}</p>
            <p className="text-xs text-destructive mt-0.5">{thisMonthExpenseCount} gider kalemi</p>
          </CardContent>
        </Card>
        <Card className={thisMonthNet >= 0 ? "border-info/30 bg-info/10" : "border-destructive/30 bg-destructive/10"}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Net (Bu Ay)
            </div>
            <p className={`text-2xl font-bold ${thisMonthNet >= 0 ? "text-info" : "text-destructive"}`}>
              {thisMonthNet >= 0 ? "+" : ""}{formatMoney(thisMonthNet, "TRY")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Gelir - Gider</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Account Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cashAccounts.map((acc) => (
          <Card key={acc.id} className={acc.balance < 0 ? "border-destructive/30 bg-destructive/10" : ""}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`w-4 h-4 ${acc.accountType === "CASH" ? "text-success" : "text-info"}`} />
                <span className="text-sm font-medium text-foreground/85 truncate">{acc.name}</span>
                <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                  {acc.accountType === "CASH" ? "Nakit" : "Banka"}
                </Badge>
              </div>
              <p className={`text-2xl font-bold ${acc.balance < 0 ? "text-destructive" : "text-foreground"}`}>
                {formatMoney(acc.balance, acc.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
        {cashAccounts.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="text-center py-8 text-muted-foreground/70">
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
                ? "border-info/60 text-info"
                : "border-transparent text-muted-foreground hover:text-foreground/85"
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
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground w-12">#</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tarih</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Kategori</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Açıklama</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Yöntem</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentExpenses.map((exp, i) => (
                    <tr key={exp.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5 text-muted-foreground/70 text-xs">{recentExpenses.length - i}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {format(new Date(exp.expenseDate), "d MMM yyyy", { locale: tr })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">
                          {EXPENSE_CATEGORIES[exp.category as keyof typeof EXPENSE_CATEGORIES]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-foreground/85">{exp.description}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs ${METHOD_BADGE[exp.method] ?? ""}`}>
                          {PAYMENT_METHODS[exp.method as keyof typeof PAYMENT_METHODS]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-destructive">
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
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground w-12">#</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tarih</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Müşteri / Başlık</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Açıklama</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Yöntem</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentPayments.map((pay, i) => (
                    <tr key={pay.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5 text-muted-foreground/70 text-xs">{recentPayments.length - i}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {format(new Date(pay.recordedAt), "d MMM yyyy", { locale: tr })}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {pay.student ? `${pay.student.firstName} ${pay.student.lastName}` : "Manuel Gelir"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{pay.description ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs ${METHOD_BADGE[pay.method] ?? ""}`}>
                          {PAYMENT_METHODS[pay.method as keyof typeof PAYMENT_METHODS]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-success">
                        +{formatMoney(pay.kasaAmount ?? pay.amount, pay.currency)}
                        {pay.kasaAmount != null && pay.kasaAmount < pay.amount && (
                          <div className="text-xs font-normal text-warning">
                            {formatMoney(pay.amount, pay.currency)} tahsilat · eğitmen payı düşüldü
                          </div>
                        )}
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
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tür</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Başlık</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Açıklama</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Yöntem</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {withIds.slice(0, 60).map((entry) => {
                    if (entry.type === "expense") {
                      const e = entry.item as typeof recentExpenses[0];
                      return (
                        <tr key={`e-${e.id}`} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-muted-foreground/70 text-xs">{entry.displayId}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {format(new Date(e.expenseDate), "d MMM yyyy", { locale: tr })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Gider</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES]}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{e.description}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={`text-xs ${METHOD_BADGE[e.method] ?? ""}`}>
                              {PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-destructive">
                            -{formatMoney(e.amount, e.currency)}
                          </td>
                        </tr>
                      );
                    } else if (entry.type === "payment") {
                      const p = entry.item as typeof recentPayments[0];
                      return (
                        <tr key={`p-${p.id}`} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-muted-foreground/70 text-xs">{entry.displayId}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {format(new Date(p.recordedAt), "d MMM yyyy", { locale: tr })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-xs">Gelir</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {p.student ? `${p.student.firstName} ${p.student.lastName}` : "Manuel Gelir"}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.description ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={`text-xs ${METHOD_BADGE[p.method] ?? ""}`}>
                              {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-success">
                            +{formatMoney(p.kasaAmount ?? p.amount, p.currency)}
                            {p.kasaAmount != null && p.kasaAmount < p.amount && (
                              <div className="text-xs font-normal text-warning">
                                {formatMoney(p.amount, p.currency)} tahsilat · eğitmen payı düşüldü
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    } else {
                      const p = entry.item as typeof recentPayouts[0];
                      return (
                        <tr key={`o-${p.id}`} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-muted-foreground/70 text-xs">{entry.displayId}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {format(new Date(p.paidAt), "d MMM yyyy", { locale: tr })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-xs">Hakediş</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{p.instructor.user.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.notes ?? "Hakediş ödemesi"}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={`text-xs ${METHOD_BADGE[p.method] ?? ""}`}>
                              {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-destructive">
                            -{formatMoney(p.amount, p.currency)}
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
