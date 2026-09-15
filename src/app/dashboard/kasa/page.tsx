import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Banknote, Landmark, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { convertAmount, formatTL } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { NewExpenseForm } from "./new-expense-form";
import { NewAccountForm } from "./new-account-form";
import { NewGelirForm } from "./new-gelir-form";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Pill, type PillTone } from "@/components/layout/pill";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  kind: "gider" | "gelir" | "hakedis";
  date: Date;
  title: string;
  description: string;
  method: string;
  amountTL: number;
  note?: string;
};

const KIND: Record<Row["kind"], { label: string; tone: PillTone }> = {
  gelir: { label: "Gelir", tone: "success" },
  gider: { label: "Gider", tone: "danger" },
  hakedis: { label: "Hakediş", tone: "warning" },
};

const TABS = [
  { key: "kasa", label: "Tüm işlemler" },
  { key: "gelirler", label: "Gelirler" },
  { key: "giderler", label: "Giderler" },
];

export default async function KasaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : "kasa";

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

  // Farklı para birimlerindeki tüm tutarlar güncel kur ile TL'ye çevrilir.
  const tl = (amount: number, currency: string) => convertAmount(amount, currency, "TRY", rates);

  const thisMonthIncome = monthlyIncome.reduce((sum, p) => sum + tl(p.kasaAmount ?? p.amount, p.currency), 0);
  const thisMonthExpense =
    monthlyExpense.reduce((sum, e) => sum + tl(e.amount, e.currency), 0) +
    monthlyPayouts.reduce((sum, p) => sum + tl(p.amount, p.currency), 0);
  const thisMonthExpenseCount = monthlyExpense.length + monthlyPayouts.length;
  const thisMonthNet = thisMonthIncome - thisMonthExpense;

  const rows: Row[] = [
    ...(tab !== "gelirler"
      ? recentExpenses.map((e) => ({
          key: `e-${e.id}`,
          kind: "gider" as const,
          date: e.expenseDate,
          title: EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category,
          description: e.description,
          method: e.method,
          amountTL: -tl(e.amount, e.currency),
        }))
      : []),
    ...(tab !== "giderler"
      ? recentPayments.map((p) => ({
          key: `p-${p.id}`,
          kind: "gelir" as const,
          date: p.recordedAt,
          title: p.student ? `${p.student.firstName} ${p.student.lastName}` : "Manuel gelir",
          description: p.description ?? "—",
          method: p.method,
          amountTL: tl(p.kasaAmount ?? p.amount, p.currency),
          note:
            p.kasaAmount != null && p.kasaAmount < p.amount
              ? `${formatTL(tl(p.amount, p.currency))} tahsilat · eğitmen payı düşüldü`
              : undefined,
        }))
      : []),
    ...(tab === "kasa"
      ? recentPayouts.map((p) => ({
          key: `o-${p.id}`,
          kind: "hakedis" as const,
          date: p.paidAt,
          title: p.instructor.user.name,
          description: p.notes ?? "Hakediş ödemesi",
          method: p.method,
          amountTL: -tl(p.amount, p.currency),
        }))
      : []),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 60);

  const signed = (amount: number) => `${amount >= 0 ? "+" : ""}${formatTL(amount)}`;
  const methodLabel = (method: string) => PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ?? method;

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        eyebrow={`Finans · ${format(now, "MMMM yyyy", { locale: tr })}`}
        title="Kasa & Muhasebe"
        actions={
          <>
            <NewAccountForm />
            <NewGelirForm cashAccounts={cashAccounts} />
            <NewExpenseForm cashAccounts={cashAccounts} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3.5">
        <StatCard label="Bu ay gelir" icon={TrendingUp} tone="success" value={formatTL(thisMonthIncome)} sub={`${monthlyIncome.length} tahsilat`} />
        <StatCard label="Bu ay gider" icon={TrendingDown} tone="danger" value={formatTL(thisMonthExpense)} sub={`${thisMonthExpenseCount} gider kalemi`} />
        <StatCard
          className="col-span-2 lg:col-span-1"
          label="Net"
          icon={Wallet}
          tone={thisMonthNet < 0 ? "danger" : "default"}
          value={formatTL(thisMonthNet)}
          sub="Gelir − gider"
        />
      </div>

      <section className="space-y-2.5">
        <h2 className="eyebrow">Kasa hesapları · TL karşılığı</h2>
        {cashAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-input bg-card py-8 text-center text-sm text-muted-foreground">
            Henüz kasa hesabı oluşturulmadı. Yukarıdan ekleyin.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
            {cashAccounts.map((account) => {
              const Icon = account.accountType === "CASH" ? Banknote : Landmark;
              return (
                <div key={account.id} className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold">{account.name}</span>
                      <Pill className="h-5 text-[11px]">{account.accountType === "CASH" ? "Nakit" : "Banka"}</Pill>
                    </div>
                    <p className={cn("num text-[26px] leading-none font-bold", account.balance < 0 && "text-destructive")}>
                      {formatTL(tl(account.balance, account.currency))}
                    </p>
                  </div>
                  {account.currency !== "TRY" && (
                    <span className="num self-end text-sm text-muted-foreground/70">
                      {new Intl.NumberFormat("tr-TR", { style: "currency", currency: account.currency }).format(account.balance)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <nav className="flex gap-6 overflow-x-auto border-b border-border px-4 lg:px-5" aria-label="İşlem türü">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className={cn(
                "flex h-12 shrink-0 items-center text-sm font-bold transition-colors",
                tab === t.key ? "text-foreground shadow-[inset_0_-2px_0_var(--primary)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Receipt className="size-7 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">Kayıt yok</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="h-10 text-left text-[11px] tracking-[0.12em] text-muted-foreground/70 uppercase">
                    <th className="px-5 font-bold">Tarih</th>
                    <th className="px-4 font-bold">Tür</th>
                    <th className="px-4 font-bold">Başlık</th>
                    <th className="px-4 font-bold">Açıklama</th>
                    <th className="px-4 font-bold">Yöntem</th>
                    <th className="px-5 text-right font-bold">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="hover:bg-muted/30">
                      <td className="border-t border-border px-5 py-3 text-[13px] whitespace-nowrap text-muted-foreground">
                        {format(row.date, "d MMM yyyy", { locale: tr })}
                      </td>
                      <td className="border-t border-border px-4 py-3">
                        <Pill tone={KIND[row.kind].tone} className="h-[22px]">
                          {KIND[row.kind].label}
                        </Pill>
                      </td>
                      <td className="border-t border-border px-4 py-3 font-bold">{row.title}</td>
                      <td className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">{row.description}</td>
                      <td className="border-t border-border px-4 py-3">
                        <Pill className="h-[22px]">{methodLabel(row.method)}</Pill>
                      </td>
                      <td className="border-t border-border px-5 py-3 text-right">
                        <span className={cn("num text-lg font-bold whitespace-nowrap", row.amountTL >= 0 ? "text-success" : "text-destructive")}>
                          {signed(row.amountTL)}
                        </span>
                        {row.note && <p className="text-xs text-warning">{row.note}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {rows.map((row) => (
                <li key={row.key} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Pill tone={KIND[row.kind].tone} className="h-5 text-[11px]">
                        {KIND[row.kind].label}
                      </Pill>
                      <span className="text-xs text-muted-foreground">{format(row.date, "d MMM yyyy", { locale: tr })}</span>
                    </div>
                    <p className="truncate font-bold">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.description} · {methodLabel(row.method)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("num text-lg font-bold whitespace-nowrap", row.amountTL >= 0 ? "text-success" : "text-destructive")}>
                      {signed(row.amountTL)}
                    </span>
                    {row.note && <p className="max-w-36 text-[11px] text-warning">{row.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
