import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LESSON_TYPES } from "@/lib/constants";
import { formatTRY, toTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { format, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { DateRangeNav } from "./date-range-nav";
import { ReservationFilterSheet } from "./reservation-filters";
import { NewReservationSheet } from "./new-reservation-sheet";
import { Clock, User, Users, TrendingUp } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PLANNED:        { label: "Bekleniyor",      cls: "bg-gray-100 text-gray-600 border-gray-200" },
  CHECKED_IN:     { label: "Check In",         cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  COMPLETED:      { label: "Tamamlandı",       cls: "bg-green-100 text-green-700 border-green-200" },
  CANCELLED:      { label: "İptal",            cls: "bg-red-100 text-red-700 border-red-200" },
  NO_SHOW:        { label: "Gelmedi",          cls: "bg-red-100 text-red-700 border-red-200" },
  WIND_CANCELLED: { label: "Rüzgar İptali",    cls: "bg-orange-100 text-orange-700 border-orange-200" },
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; types?: string; statuses?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  // Geriye dönük uyumluluk: eski ?date= parametresi
  const today = todayStr();
  const fromStr = params.from ?? params.date ?? today;
  const toStr   = params.to   ?? params.date ?? today;

  const activeTypes    = params.types    ? params.types.split(",").filter(Boolean)    : [];
  const activeStatuses = params.statuses ? params.statuses.split(",").filter(Boolean) : [];

  const fromDate = new Date(fromStr);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(toStr);
  toDate.setHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      isActive: true,
      startTime: { gte: fromDate, lte: toDate },
      ...(activeTypes.length    ? { lessonType: { in: activeTypes } }    : {}),
      ...(activeStatuses.length ? { status:     { in: activeStatuses } } : {}),
      ...(user.role === "INSTRUCTOR" ? { instructor: { userId: user.userId } } : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      instructor: { include: { user: { select: { name: true } } } },
      lesson: {
        select: {
          checkOutTime: true,
          actualHours: true,
          purchase: { select: { purchasePrice: true, totalHours: true, currency: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const [students, instructors, equipment] = user.role !== "INSTRUCTOR"
    ? await Promise.all([
        prisma.student.findMany({
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.instructor.findMany({
          where: { isActive: true },
          include: { user: { select: { name: true } } },
          orderBy: { user: { name: "asc" } },
        }),
        prisma.equipment.findMany({
          where: { isActive: true, status: { not: "RETIRED" } },
          select: { id: true, type: true, name: true, size: true },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
      ])
    : [[], [], []];

  const rates = await getExchangeRates();

  // Günlere göre grupla
  const days: { date: Date; items: typeof reservations }[] = [];
  for (const res of reservations) {
    const d = new Date(res.startTime);
    const existing = days.find((x) => isSameDay(x.date, d));
    if (existing) existing.items.push(res);
    else days.push({ date: d, items: [res] });
  }

  // Paketin saatlik ücreti üzerinden, paketin kendi para biriminde ders tutarı
  const lessonPrice = (res: (typeof reservations)[number]) => {
    const purchase = res.lesson?.purchase;
    if (!purchase) return null;
    const hours = res.lesson?.actualHours ?? res.plannedHours;
    return { amount: (purchase.purchasePrice / purchase.totalHours) * hours, currency: purchase.currency };
  };

  // Özet istatistikler — farklı para birimlerindeki tutarlar toplanmadan önce TL'ye çevrilir
  const totalRevenue = reservations.reduce((sum, res) => {
    const price = lessonPrice(res);
    return sum + (price ? toTRY(price.amount, price.currency, rates) : 0);
  }, 0);

  const completedCount = reservations.filter((r) => r.status === "COMPLETED").length;
  const cancelledCount = reservations.filter(
    (r) => ["CANCELLED", "NO_SHOW", "WIND_CANCELLED"].includes(r.status)
  ).length;
  const uniqueInstructors = new Set(reservations.map((r) => r.instructorId).filter(Boolean)).size;

  const isSingleDay = fromStr === toStr;
  // Paket fiyatları okulun geliridir; eğitmen yalnızca kendi hakedişini Performansım'da görür.
  const showPrices = user.role !== "INSTRUCTOR";

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isSingleDay
              ? format(fromDate, "d MMMM yyyy, EEEE", { locale: tr })
              : `${format(fromDate, "d MMM yyyy", { locale: tr })} — ${format(toDate, "d MMM yyyy", { locale: tr })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReservationFilterSheet
            from={fromStr}
            to={toStr}
            activeTypes={activeTypes}
            activeStatuses={activeStatuses}
          />
          {user.role !== "INSTRUCTOR" && (
            <NewReservationSheet students={students} instructors={instructors} equipment={equipment} />
          )}
        </div>
      </div>

      {/* Tarih aralığı seçici */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <DateRangeNav from={fromStr} to={toStr} />
      </div>

      {/* Özet kartlar */}
      {reservations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">Toplam</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
            <p className="text-xs text-gray-400">rezervasyon</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">Tamamlandı</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-400">ders</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs text-gray-500 font-medium">İptal</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{cancelledCount}</p>
            <p className="text-xs text-gray-400">rezervasyon</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">Eğitmen</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{uniqueInstructors}</p>
            <p className="text-xs text-gray-400">aktif</p>
          </div>
        </div>
      )}

      {/* Boş durum */}
      {reservations.length === 0 && (
        <div className="bg-white border rounded-xl text-center py-16 text-gray-400 shadow-sm">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Bu tarih aralığında rezervasyon bulunamadı</p>
        </div>
      )}

      {/* Günlere göre gruplu liste */}
      {days.map(({ date, items }) => (
        <div key={date.toISOString()} className="space-y-3">
          {/* Gün başlığı */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-900 text-white rounded-xl flex-shrink-0">
              <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">{format(date, "MMM", { locale: tr })}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{format(date, "EEEE", { locale: tr })}</p>
              <p className="text-xs text-gray-400">{items.length} rezervasyon</p>
            </div>
            <div className="flex-1 h-px bg-gray-100 ml-2" />
          </div>

          {/* Kartlar */}
          <div className="space-y-2 pl-0">
            {items.map((res) => {
              const status = STATUS_BADGE[res.status] ?? STATUS_BADGE.PLANNED;
              const hours = res.lesson?.actualHours ?? res.plannedHours;
              const price = lessonPrice(res);
              const instrColor = res.instructor?.color ?? "#9CA3AF";

              return (
                <div
                  key={res.id}
                  className="bg-white border rounded-xl shadow-sm overflow-hidden flex"
                >
                  {/* Sol renk şeridi (eğitmen rengi) */}
                  <div className="w-1 flex-shrink-0" style={{ backgroundColor: instrColor }} />

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Sol: müşteri + hizmet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {res.student.firstName} {res.student.lastName}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {LESSON_TYPES[res.lessonType as keyof typeof LESSON_TYPES] ?? res.lessonType}
                          </span>
                          {res.lesson?.purchase && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              Paket
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(res.startTime), "HH:mm")} — {format(new Date(res.endTime), "HH:mm")}
                            <span className="text-gray-400">({hours} saat)</span>
                          </span>
                          {res.instructor && (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: instrColor }}
                              />
                              {res.instructor.user.name}
                            </span>
                          )}
                          {res.notes && (
                            <span className="text-gray-400 italic text-xs">"{res.notes}"</span>
                          )}
                        </div>
                      </div>

                      {/* Sağ: durum + fiyat */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                        {showPrices &&
                          (price ? (
                            <span className="text-base font-bold text-gray-900">
                              {formatTRY(price.amount, price.currency, rates)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Toplam gelir (aralık görünümünde) */}
      {showPrices && !isSingleDay && totalRevenue > 0 && (
        <div className="bg-gray-900 text-white rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium opacity-70">Toplam Tahminî Gelir</span>
          <span className="text-xl font-bold">{formatTRY(totalRevenue, "TRY", rates)}</span>
        </div>
      )}
    </div>
  );
}
