import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, GraduationCap, Users, Wallet } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { formatTL, formatTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { getInstructorBalance, getInstructorMonth } from "@/lib/instructor-performance-data";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Pill } from "@/components/layout/pill";

function parseMonth(value?: string): Date {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return startOfMonth(new Date());
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

const monthLink = "flex size-11 items-center justify-center rounded-lg border border-input bg-card";

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
  const paidShare = balance.earnedTRY > 0 ? Math.min(100, (balance.paidTRY / balance.earnedTRY) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 lg:space-y-6">
      <PageHeader
        eyebrow="Eğitmen portalı"
        title="Performansım"
        actions={
          <div className="flex w-full items-center gap-2 lg:w-auto">
            <Link href={`/dashboard/performansim?ay=${format(subMonths(monthStart, 1), "yyyy-MM")}`} className={monthLink} aria-label="Önceki ay">
              <ChevronLeft className="size-[18px]" />
            </Link>
            <span className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 font-heading text-lg font-bold uppercase lg:min-w-40">
              {format(monthStart, "MMMM yyyy", { locale: tr })}
            </span>
            {isCurrentMonth ? (
              <span className={`${monthLink} text-muted-foreground/40`} aria-hidden>
                <ChevronRight className="size-[18px]" />
              </span>
            ) : (
              <Link href={`/dashboard/performansim?ay=${format(addMonths(monthStart, 1), "yyyy-MM")}`} className={monthLink} aria-label="Sonraki ay">
                <ChevronRight className="size-[18px]" />
              </Link>
            )}
          </div>
        }
      />

      {/* Bekleyen hakediş — tüm zamanlar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Bekleyen hakediş</span>
          <Wallet className="size-[18px] text-muted-foreground/70" />
        </div>
        <span className="num text-5xl leading-none font-extrabold text-primary lg:text-6xl">{formatTL(balance.pendingTRY)}</span>
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-input" role="progressbar" aria-valuenow={Math.round(paidShare)} aria-valuemin={0} aria-valuemax={100} aria-label="Ödenen hakediş oranı">
            <div className="h-full rounded-full bg-foreground/90" style={{ width: `${paidShare}%` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Ödenen <span className="num text-[15px] font-bold text-foreground">{formatTL(balance.paidTRY)}</span>
            </span>
            <span>
              Hak edilen <span className="num text-[15px] font-bold text-foreground">{formatTL(balance.earnedTRY)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <StatCard label="Ders" icon={GraduationCap} value={month.sessionCount} sub="Tamamlanan" />
        <StatCard
          label="Toplam saat"
          icon={Clock}
          value={month.totalHours.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
          sub="Suda geçen süre"
        />
        <StatCard label="Öğrenci" icon={Users} value={month.studentCount} sub="Farklı öğrenci" />
        <StatCard label="Bu ay hakediş" tone="success" value={month.earnedTRY > 0 ? formatTL(month.earnedTRY) : "—"} sub="TL karşılığı" />
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Ders geçmişi</h2>
        {month.rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm font-semibold text-muted-foreground">
            Bu ay tamamlanan ders yok
          </div>
        ) : (
          <div className="space-y-2.5">
            {month.rows.map((row) => (
              <div key={`${row.kind}-${row.id}`} className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3.5">
                <div className="flex h-[52px] w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
                  <span className="num text-[22px] font-bold">{format(row.date, "dd")}</span>
                  <span className="mt-0.5 font-heading text-[11px] font-bold text-muted-foreground/70 uppercase">
                    {format(row.date, "MMM", { locale: tr })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{row.studentName ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.title} · {format(row.date, "HH:mm")}
                    {row.hours ? ` · ${row.hours.toLocaleString("tr-TR")} sa` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="num text-xl font-bold">{row.earnedTRY !== null ? formatTL(row.earnedTRY) : "—"}</span>
                  <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/70 uppercase">hakediş</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {payouts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">Ödeme geçmişi</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-[13px] text-muted-foreground">{format(payout.paidAt, "d MMMM yyyy", { locale: tr })}</p>
                  <Pill className="h-5 text-[11px]">{PAYMENT_METHODS[payout.method as keyof typeof PAYMENT_METHODS] ?? payout.method}</Pill>
                </div>
                <span className="num text-[22px] font-bold">{formatTRY(payout.amount, payout.currency, rates)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
