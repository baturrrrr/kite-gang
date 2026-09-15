import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Clock, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import { LESSON_TYPES } from "@/lib/constants";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { getWindConditions } from "@/lib/weather";
import { convertAmount, formatTL } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Pill, ReservationStatusPill } from "@/components/layout/pill";
import { WindCard } from "@/components/weather/wind-card";
import { RevenueChart, type RevenuePoint } from "@/components/charts/revenue-chart";
import { cn } from "@/lib/utils";

const compactTL = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 2 });

export default async function DashboardPage() {
  const user = await requireAuth();
  const isInstructor = user.role === "INSTRUCTOR";

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const rangeStart = subDays(today, 29);
  const previousStart = subDays(rangeStart, 30);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [wind, rates, todayReservations] = await Promise.all([
    getWindConditions(),
    getExchangeRates(),
    prisma.reservation.findMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
        isActive: true,
        ...(isInstructor ? { instructor: { userId: user.userId } } : {}),
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        instructor: { select: { color: true, user: { select: { name: true } } } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const stats = isInstructor
    ? null
    : await (async () => {
        const [payments, cashAccounts, monthLessons, activeStudents, todayHizmetler] = await Promise.all([
          prisma.payment.findMany({
            where: { direction: "INCOMING", recordedAt: { gte: previousStart, lt: tomorrow } },
            select: { amount: true, kasaAmount: true, currency: true, recordedAt: true },
          }),
          prisma.cashAccount.findMany({ where: { isActive: true }, select: { balance: true, currency: true } }),
          prisma.lesson.count({ where: { checkInTime: { gte: monthStart } } }),
          prisma.student.count({ where: { isActive: true } }),
          prisma.hizmet.count({
            where: { isActive: true, scheduledAt: { gte: today, lt: tomorrow }, status: { not: "IPTAL" } },
          }),
        ]);

        // Kasaya giren tutar TL'ye çevrilerek günlere dağıtılır
        const tl = (p: (typeof payments)[number]) => convertAmount(p.kasaAmount ?? p.amount, p.currency, "TRY", rates);
        const days: RevenuePoint[] = Array.from({ length: 30 }, (_, i) => {
          const day = addDays(rangeStart, i);
          return { key: format(day, "yyyy-MM-dd"), label: format(day, "d MMM", { locale: tr }), amount: 0 };
        });
        let previousTotal = 0;
        let todayIncome = 0;
        let todayCount = 0;
        for (const payment of payments) {
          const amount = tl(payment);
          if (payment.recordedAt < rangeStart) {
            previousTotal += amount;
            continue;
          }
          const bucket = days.find((d) => d.key === format(payment.recordedAt, "yyyy-MM-dd"));
          if (bucket) bucket.amount += amount;
          if (payment.recordedAt >= today) {
            todayIncome += amount;
            todayCount += 1;
          }
        }
        const rangeTotal = days.reduce((sum, d) => sum + d.amount, 0);
        const change = previousTotal > 0 ? ((rangeTotal - previousTotal) / previousTotal) * 100 : null;
        const cashTotal = cashAccounts.reduce((sum, a) => sum + convertAmount(a.balance, a.currency, "TRY", rates), 0);

        return { days, rangeTotal, change, todayIncome, todayCount, cashTotal, cashCount: cashAccounts.length, monthLessons, activeStudents, todayHizmetler };
      })();

  const inWater = todayReservations.filter((r) => r.status === "CHECKED_IN").length;
  const planned = todayReservations.filter((r) => r.status === "PLANNED").length;

  const lessonsCard = (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 pt-4 pb-1 lg:px-6 lg:pt-5">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-extrabold">{isInstructor ? "Bugünkü derslerim" : "Bugünkü dersler"}</h2>
          <Pill>{todayReservations.length}</Pill>
        </div>
        <Link href="/dashboard/operasyon" className="flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-primary">
          Operasyon
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {todayReservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t border-border py-12 text-center">
          <Clock className="size-7 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-muted-foreground">Bugün için planlanmış ders yok</p>
        </div>
      ) : (
        todayReservations.map((res) => (
          <div key={res.id} className="flex items-center gap-3.5 border-t border-border py-3">
            <div className="flex w-14 shrink-0 flex-col leading-none">
              <span className="num text-[22px] font-bold">{format(res.startTime, "HH:mm")}</span>
              <span className="num mt-1 text-[13px] text-muted-foreground/70">{format(res.endTime, "HH:mm")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">
                {res.student.firstName} {res.student.lastName}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: res.instructor?.color ?? "#5c646e" }} />
                {res.instructor?.user.name ?? "Eğitmen yok"} · {LESSON_TYPES[res.lessonType as keyof typeof LESSON_TYPES] ?? res.lessonType}
              </p>
            </div>
            <ReservationStatusPill status={res.status} />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        eyebrow={format(today, "d MMMM yyyy · EEEE", { locale: tr })}
        title={`Hoş geldin, ${user.name.split(" ")[0]}`}
        actions={
          !isInstructor && (
            // Telefonda aynı iş alt gezinmedeki "+" düğmesinde
            <Link href="/dashboard/rezervasyonlar/yeni" className={cn(buttonVariants(), "hidden h-10 px-4 lg:inline-flex")}>
              <Plus strokeWidth={2.6} />
              Yeni Rezervasyon
            </Link>
          )
        }
      />

      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5 lg:gap-3.5">
            <StatCard
              tone="hero"
              className="col-span-2 lg:col-span-1"
              label="Bugün gelir"
              icon={TrendingUp}
              value={stats.todayIncome > 0 ? formatTL(stats.todayIncome) : "—"}
              sub={stats.todayCount > 0 ? `${stats.todayCount} tahsilat · kasaya işlendi` : "Henüz tahsilat yok"}
            />
            <StatCard label="Müşteriler" icon={Users} value={stats.activeStudents} sub={`Bu ay ${stats.monthLessons} ders`} />
            <StatCard
              label="Bugün seans"
              icon={CalendarDays}
              value={todayReservations.length + stats.todayHizmetler}
              sub={`${inWater} suda · ${planned} planlandı`}
            />
            <StatCard
              label="Kasa"
              icon={Wallet}
              value={`₺${compactTL.format(stats.cashTotal)}`}
              sub={`${stats.cashCount} hesap · ${formatTL(stats.cashTotal)}`}
            />
            <WindCard wind={wind} className="col-span-2 lg:col-span-1" />
          </div>

          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 lg:px-6 lg:py-5">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Son 30 gün · Gelir</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="num text-[34px] leading-none font-bold lg:text-[40px]">{formatTL(stats.rangeTotal)}</span>
                  {stats.change !== null && (
                    <>
                      <Pill tone={stats.change >= 0 ? "success" : "danger"}>
                        {stats.change >= 0 ? <ArrowUpRight strokeWidth={2.6} /> : <ArrowDownRight strokeWidth={2.6} />}%
                        {Math.abs(stats.change).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                      </Pill>
                      <span className="text-[13px] text-muted-foreground">önceki 30 güne göre</span>
                    </>
                  )}
                </div>
              </div>
              <RevenueChart data={stats.days} />
            </div>
            {lessonsCard}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
            <StatCard label="Bugünkü derslerim" icon={CalendarDays} value={todayReservations.length} sub={`${inWater} suda · ${planned} planlandı`} />
            <WindCard wind={wind} />
            <Link
              href="/dashboard/performansim"
              className="col-span-2 flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground lg:p-[18px]"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold tracking-[0.14em] text-primary-foreground/60 uppercase">Eğitmen portalı</span>
                <span className="font-heading text-3xl font-extrabold uppercase">Performansım</span>
                <span className="text-xs font-semibold text-primary-foreground/70">Ders, saat ve hakediş bakiyen</span>
              </div>
              <ArrowRight className="size-7" />
            </Link>
          </div>
          {lessonsCard}
        </>
      )}
    </div>
  );
}
