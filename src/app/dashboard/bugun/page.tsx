import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPES, RESERVATION_STATUSES, STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarClock, GraduationCap, Navigation, Waves, Wind } from "lucide-react";
import { HizmetRowActions } from "../musteriler/[id]/hizmet-row-actions";
import { OdemeDialog } from "../musteriler/[id]/odeme-dialog";
import { CheckInButton } from "../operasyon/checkin-button";
import { CheckOutDialog } from "../operasyon/checkout-dialog";
import Link from "next/link";
import { getWindConditions } from "@/lib/weather";
import { toTRY, formatTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

function windSuitability(speedKn: number): { label: string; className: string } {
  if (speedKn < 10) return { label: "Zayıf", className: "text-gray-600 bg-gray-100" };
  if (speedKn <= 25) return { label: "İdeal", className: "text-emerald-700 bg-emerald-100" };
  return { label: "Kuvvetli", className: "text-amber-700 bg-amber-100" };
}

const HIZMET_STATUS_BADGE: Record<string, string> = {
  BEKLIYOR: "bg-yellow-100 text-yellow-800",
  DEVAM: "bg-blue-100 text-blue-800",
  TAMAMLANDI: "bg-green-100 text-green-800",
  IPTAL: "bg-gray-100 text-gray-600",
};
const HIZMET_STATUS_LABEL: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  DEVAM: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal",
};

export default async function BugunPage() {
  const user = await requireAuth();
  const wind = await getWindConditions();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [hizmetler, reservations, todayPayments] = await Promise.all([
    prisma.hizmet.findMany({
      where: {
        isActive: true,
        status: { not: "IPTAL" },
        OR: [
          { scheduledAt: { gte: today, lt: tomorrow } },
          { scheduledAt: null, createdAt: { gte: today, lt: tomorrow } },
        ],
        ...(user.role === "INSTRUCTOR" ? { instructor: { userId: user.userId } } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        instructor: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.reservation.findMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
        isActive: true,
        status: { not: "CANCELLED" },
        ...(user.role === "INSTRUCTOR" ? { instructor: { userId: user.userId } } : {}),
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            // Check-in ve no-show, saati kalmış en eski paketi kullanır (bkz. actions/reservations.ts)
            packagePurchases: {
              where: { isActive: true, remainingHours: { gt: 0 } },
              select: { id: true },
              orderBy: { purchasedAt: "asc" },
              take: 1,
            },
          },
        },
        instructor: { include: { user: { select: { name: true } } } },
        lesson: true,
      },
      orderBy: { startTime: "asc" },
    }),
    user.role !== "INSTRUCTOR"
      ? prisma.payment.findMany({
          where: { direction: "INCOMING", recordedAt: { gte: today, lt: tomorrow } },
          select: { amount: true, kasaAmount: true, currency: true },
        })
      : Promise.resolve([]),
  ]);

  const rates = await getExchangeRates();
  const formatMoney = (amount: number, currency: string) => formatTRY(amount, currency, rates);

  // Farklı para birimlerindeki tahsilatlar TL'ye çevrilip tek toplamda gösterilir.
  const todayIncomeTRY = todayPayments.reduce(
    (sum, p) => sum + toTRY(p.kasaAmount ?? p.amount, p.currency, rates),
    0
  );

  const totalCount = hizmetler.length + reservations.length;
  const totalBekleyen =
    hizmetler.filter((h) => h.status === "BEKLIYOR").length +
    reservations.filter((r) => r.status === "PLANNED").length;
  const totalDevam =
    hizmetler.filter((h) => h.status === "DEVAM").length +
    reservations.filter((r) => r.status === "CHECKED_IN").length;
  const totalTamam =
    hizmetler.filter((h) => h.status === "TAMAMLANDI").length +
    reservations.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bugün</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-gray-500">Toplam Seans</p>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-yellow-700 font-medium">Bekliyor</p>
            <p className="text-2xl font-bold text-yellow-800">{totalBekleyen}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-blue-700 font-medium">Devam Ediyor</p>
            <p className="text-2xl font-bold text-blue-800">{totalDevam}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-green-700 font-medium">Tamamlandı</p>
            <p className="text-2xl font-bold text-green-800">{totalTamam}</p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-1 text-xs text-sky-700 font-medium">
              <Wind className="w-3.5 h-3.5" />
              Rüzgar
            </div>
            {wind ? (
              <>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-sky-900">{Math.round(wind.windSpeedKn)}</p>
                  <span className="text-xs text-sky-600">kn</span>
                  <Navigation
                    className="w-3.5 h-3.5 text-sky-500 ml-0.5"
                    style={{ transform: `rotate(${wind.windDirectionDeg + 180}deg)` }}
                  />
                </div>
                <span
                  className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${windSuitability(wind.windSpeedKn).className}`}
                >
                  {windSuitability(wind.windSpeedKn).label}
                </span>
              </>
            ) : (
              <p className="text-sm text-sky-400 mt-1">—</p>
            )}
          </CardContent>
        </Card>
        {user.role !== "INSTRUCTOR" && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-emerald-700 font-medium">Bugünkü Gelir</p>
              {todayPayments.length > 0 ? (
                <p className="text-lg font-bold text-emerald-800">₺{todayIncomeTRY.toFixed(2)}</p>
              ) : (
                <p className="text-lg font-bold text-emerald-800">—</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hizmet-based today's items */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-500" />
          Bugünkü Dersler & Hizmetler ({hizmetler.length})
        </h2>
        {hizmetler.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Bugün için planlanmış hizmet yok</p>
        ) : (
          <div className="space-y-2">
            {hizmetler.map((h) => (
              <Card key={h.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-xs text-gray-400 w-11 flex-shrink-0">
                        {h.scheduledAt ? format(new Date(h.scheduledAt), "HH:mm") : "—"}
                      </div>
                      <div className="min-w-0">
                        {h.studentId && user.role !== "INSTRUCTOR" ? (
                          <Link
                            href={`/dashboard/musteriler/${h.studentId}`}
                            className="font-semibold text-gray-900 hover:text-blue-600"
                          >
                            {h.student?.firstName} {h.student?.lastName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {h.student ? `${h.student.firstName} ${h.student.lastName}` : "Müşteri belirtilmedi"}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 truncate">
                          {h.title}
                          {h.instructor && ` · ${h.instructor.user.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {user.role !== "INSTRUCTOR" && (
                        <span className="text-sm font-semibold text-gray-700">{formatMoney(h.amount, h.currency)}</span>
                      )}
                      <Badge className={HIZMET_STATUS_BADGE[h.status]}>{HIZMET_STATUS_LABEL[h.status]}</Badge>
                      {user.role !== "INSTRUCTOR" && h.studentId && (
                        <>
                          <HizmetRowActions id={h.id} studentId={h.studentId} status={h.status} />
                          <OdemeDialog
                            studentId={h.studentId}
                            hizmetler={[
                              {
                                id: h.id,
                                title: h.title,
                                amount: h.amount,
                                currency: h.currency,
                                instructorEarning: h.instructorEarning,
                                instructorName: h.instructor?.user.name ?? null,
                              },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Legacy reservations */}
      {reservations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Waves className="w-5 h-5 text-cyan-500" />
            Bugünkü Rezervasyonlar ({reservations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reservations.map((res) => (
              <Card key={res.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: res.instructor?.color ?? "#9CA3AF" }}
                        />
                        <p className="font-semibold text-gray-900">
                          {res.student.firstName} {res.student.lastName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 ml-4">{res.instructor?.user.name ?? "Personel atanmadı"}</p>
                    </div>
                    <Badge className={STATUS_COLORS[res.status]}>
                      {RESERVATION_STATUSES[res.status as keyof typeof RESERVATION_STATUSES]}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {format(new Date(res.startTime), "HH:mm")}–{format(new Date(res.endTime), "HH:mm")}
                    {" · "}
                    {LESSON_TYPES[res.lessonType as keyof typeof LESSON_TYPES]}
                  </p>
                  {res.status === "PLANNED" && (
                    <div className="mt-3">
                      <CheckInButton
                        reservationId={res.id}
                        purchaseId={res.student.packagePurchases[0]?.id}
                        plannedHours={res.plannedHours}
                      />
                    </div>
                  )}
                  {res.status === "CHECKED_IN" && res.lesson && (
                    <div className="mt-3">
                      <CheckOutDialog
                        lessonId={res.lesson.id}
                        studentName={`${res.student.firstName} ${res.student.lastName}`}
                        plannedHours={res.plannedHours}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Bugün için planlanmış hiçbir şey yok</p>
        </div>
      )}
    </div>
  );
}
