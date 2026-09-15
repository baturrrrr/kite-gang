import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  TrendingUp,
  Users,
  Wallet,
  Clock,
  Activity,
} from "lucide-react";
import { CURRENCY_SYMBOLS, RESERVATION_STATUSES, STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getWindConditions } from "@/lib/weather";
import { WindWidget } from "@/components/weather/wind-widget";
import { convertAmount } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const wind = await getWindConditions();

  const todayReservations = await prisma.reservation.findMany({
    where: {
      startTime: { gte: today, lt: tomorrow },
      isActive: true,
      ...(user.role === "INSTRUCTOR" ? { instructor: { userId: user.userId } } : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      instructor: { include: { user: { select: { name: true } } } },
    },
    orderBy: { startTime: "asc" },
  });

  const stats = user.role !== "INSTRUCTOR" ? await (async () => {
    const todayPayments = await prisma.payment.findMany({
      where: { direction: "INCOMING", recordedAt: { gte: today, lt: tomorrow } },
    });
    // Farklı para birimlerindeki ödemeler güncel kur ile TRY'ye çevrilip tek toplamda gösterilir.
    const rates = await getExchangeRates();
    const todayIncomeTRY = todayPayments.reduce(
      (sum, p) => sum + convertAmount(p.kasaAmount ?? p.amount, p.currency, "TRY", rates),
      0
    );

    const cashAccounts = await prisma.cashAccount.findMany({ where: { isActive: true } });
    const thisMonthLessons = await prisma.lesson.count({
      where: { checkInTime: { gte: thisMonthStart } },
    });
    const activeStudents = await prisma.student.count({ where: { isActive: true } });
    const pendingHizmetler = await prisma.hizmet.count({
      where: { isActive: true, status: "BEKLIYOR" },
    });
    const todayHizmetler = await prisma.hizmet.count({
      where: {
        isActive: true,
        scheduledAt: { gte: today, lt: tomorrow },
        status: { not: "IPTAL" },
      },
    });

    return { todayIncomeTRY, cashAccounts, thisMonthLessons, activeStudents, pendingHizmetler, todayHizmetler };
  })() : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight">
          Hoş Geldiniz, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Bugünkü Gelir — signature hero stat */}
          <div className="relative overflow-hidden rounded-xl p-5 text-background bg-primary">
            <div className="relative flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Bugün Gelir</p>
              <div className="w-8 h-8 rounded-lg bg-card/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            {stats.todayIncomeTRY > 0 ? (
              <p className="relative text-2xl font-heading font-semibold">{formatMoney(stats.todayIncomeTRY, "TRY")}</p>
            ) : (
              <p className="relative text-2xl font-heading font-semibold text-white/50">—</p>
            )}
            <p className="relative text-xs text-white/70 mt-1">Tahsilat</p>
          </div>

          {/* Müşteriler */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Müşteriler</p>
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-heading font-semibold text-foreground">{stats.activeStudents}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">Bu ay {stats.thisMonthLessons} ders</p>
          </div>

          {/* Bugün Seans */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bugün Seans</p>
              <div className="w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-coral" />
              </div>
            </div>
            <p className="text-2xl font-heading font-semibold text-foreground">{stats.todayHizmetler + todayReservations.length}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">{stats.pendingHizmetler} bekliyor</p>
          </div>

          {/* Kasa */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kasa</p>
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-success" />
              </div>
            </div>
            {stats.cashAccounts.length > 0 ? (
              <div className="space-y-1">
                {stats.cashAccounts.slice(0, 2).map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground/80 truncate max-w-[80px]">{acc.name}</span>
                    <span className="text-sm font-semibold text-foreground">{formatMoney(acc.balance, acc.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">Kasa yok</p>
            )}
          </div>

          <WindWidget wind={wind} />
        </div>
      )}

      {!stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <WindWidget wind={wind} />
        </div>
      )}

      {/* Today's Reservations */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-foreground">Bugünkü Dersler</p>
              <p className="text-xs text-muted-foreground/80">Rezervasyon sistemi</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-medium">
            {todayReservations.length} ders
          </Badge>
        </div>

        {todayReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Bugün için planlanmış ders yok</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Rezervasyonlar buraya gelecek</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {todayReservations.map((res) => (
              <div key={res.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: res.instructor?.color ?? "#9CA3AF" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {res.student.firstName} {res.student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {res.instructor?.user.name ?? "Personel atanmadı"}
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    {format(new Date(res.startTime), "HH:mm")}
                    {" – "}
                    {format(new Date(res.endTime), "HH:mm")}
                  </p>
                </div>
                <Badge className={`text-xs ${STATUS_COLORS[res.status]}`}>
                  {RESERVATION_STATUSES[res.status as keyof typeof RESERVATION_STATUSES]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
