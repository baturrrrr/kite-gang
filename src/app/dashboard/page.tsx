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
    const todayIncome: Record<string, number> = {};
    for (const p of todayPayments) {
      todayIncome[p.currency] = (todayIncome[p.currency] ?? 0) + p.amount;
    }

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

    return { todayIncome, cashAccounts, thisMonthLessons, activeStudents, pendingHizmetler, todayHizmetler };
  })() : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Hoş Geldiniz, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">
          {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bugünkü Gelir */}
          <div className="bg-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">Bugün Gelir</p>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            {Object.entries(stats.todayIncome).length > 0 ? (
              Object.entries(stats.todayIncome).map(([currency, amount]) => (
                <p key={currency} className="text-2xl font-bold">{formatMoney(amount, currency)}</p>
              ))
            ) : (
              <p className="text-2xl font-bold text-blue-300">—</p>
            )}
            <p className="text-xs text-blue-300 mt-1">Tahsilat</p>
          </div>

          {/* Müşteriler */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Müşteriler</p>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.activeStudents}</p>
            <p className="text-xs text-slate-400 mt-1">Bu ay {stats.thisMonthLessons} ders</p>
          </div>

          {/* Bugün Seans */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bugün Seans</p>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.todayHizmetler + todayReservations.length}</p>
            <p className="text-xs text-slate-400 mt-1">{stats.pendingHizmetler} bekliyor</p>
          </div>

          {/* Kasa */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kasa</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            {stats.cashAccounts.length > 0 ? (
              <div className="space-y-1">
                {stats.cashAccounts.slice(0, 2).map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 truncate max-w-[80px]">{acc.name}</span>
                    <span className="text-sm font-bold text-slate-800">{formatMoney(acc.balance, acc.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Kasa yok</p>
            )}
          </div>
        </div>
      )}

      {/* Today's Reservations */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Bugünkü Dersler</p>
              <p className="text-xs text-slate-400">Rezervasyon sistemi</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-medium">
            {todayReservations.length} ders
          </Badge>
        </div>

        {todayReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">Bugün için planlanmış ders yok</p>
            <p className="text-xs text-slate-400 mt-1">Rezervasyonlar buraya gelecek</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {todayReservations.map((res) => (
              <div key={res.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: res.instructor.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {res.student.firstName} {res.student.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {res.instructor.user.name}
                    <span className="mx-1.5 text-slate-300">·</span>
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
