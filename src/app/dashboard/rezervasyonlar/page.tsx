import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { LESSON_TYPES, CURRENCY_SYMBOLS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DateNav } from "./date-nav";

const ATTENDANCE_STATUSES: Record<string, { label: string; class: string }> = {
  PLANNED: { label: "Bekleniyor", class: "bg-gray-100 text-gray-600" },
  CHECKED_IN: { label: "Check In'lendi", class: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Check Out'landı", class: "bg-green-100 text-green-700" },
  CANCELLED: { label: "İptal", class: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "Gelmedi", class: "bg-red-100 text-red-700" },
  WIND_CANCELLED: { label: "Rüzgar İptali", class: "bg-orange-100 text-orange-700" },
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const filterDate = params.date ? new Date(params.date) : new Date();
  const dayStart = new Date(filterDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(filterDate);
  dayEnd.setHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      isActive: true,
      startTime: { gte: dayStart, lte: dayEnd },
      ...(params.status ? { status: params.status } : {}),
      ...(user.role === "INSTRUCTOR"
        ? { instructor: { userId: user.userId } }
        : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      instructor: { include: { user: { select: { name: true } } } },
      lesson: {
        select: {
          id: true,
          checkOutTime: true,
          actualHours: true,
          purchase: { select: { purchasePrice: true, totalHours: true, currency: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
        </div>
        {user.role !== "INSTRUCTOR" && (
          <Link href="/dashboard/rezervasyonlar/yeni">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Rezervasyon
            </Button>
          </Link>
        )}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <span className="font-medium">
            {format(filterDate, "d MMMM yyyy, EEEE", { locale: tr })}
          </span>
        </div>
        <DateNav currentDate={format(filterDate, "yyyy-MM-dd")} />
      </div>

      <Card>
        <CardContent className="p-0">
          {reservations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Bu gün için rezervasyon bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih & Saat</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Müşteri</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Hizmet</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Personel</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rez. Durumu</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Katılım Durumu</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Süre</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Fiyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservations.map((res) => {
                    const attendance = ATTENDANCE_STATUSES[res.status];
                    const hourlyRate = res.lesson?.purchase
                      ? res.lesson.purchase.purchasePrice / res.lesson.purchase.totalHours
                      : null;
                    const lessonPrice = hourlyRate && res.lesson?.actualHours
                      ? hourlyRate * res.lesson.actualHours
                      : hourlyRate
                      ? hourlyRate * res.plannedHours
                      : null;
                    const currency = res.lesson?.purchase?.currency;
                    const symbol = currency ? (CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency) : "";

                    return (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: res.instructor.color }}
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {format(new Date(res.startTime), "HH:mm")} - {format(new Date(res.endTime), "HH:mm")}
                              </div>
                              {res.notes && (
                                <div className="text-xs text-gray-400 italic">{res.notes}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {res.student.firstName} {res.student.lastName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">
                            {LESSON_TYPES[res.lessonType as keyof typeof LESSON_TYPES]}
                          </div>
                          {res.lesson?.purchase && (
                            <div className="text-xs text-gray-400">Paket Kullanıldı</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{res.instructor.user.name}</td>
                        <td className="px-4 py-3">
                          {["CANCELLED", "NO_SHOW", "WIND_CANCELLED"].includes(res.status) ? (
                            <Badge variant="outline" className={`text-xs ${
                              res.status === "WIND_CANCELLED"
                                ? "bg-orange-100 text-orange-700 border-orange-200"
                                : "bg-red-100 text-red-700 border-red-200"
                            }`}>
                              {res.status === "CANCELLED" ? "İptal Edildi" : res.status === "NO_SHOW" ? "Gelmedi" : "Rüzgar İptali"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                              Onaylandı
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {attendance && (
                            <Badge variant="outline" className={`text-xs ${attendance.class}`}>
                              {attendance.label}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {res.lesson?.actualHours
                            ? `${res.lesson.actualHours} saat`
                            : `${res.plannedHours} saat`}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {lessonPrice ? `${symbol}${lessonPrice.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
