import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Clock, TrendingUp, Wallet, GraduationCap } from "lucide-react";
import { PAYMENT_MODELS, LESSON_TYPES, RESERVATION_STATUSES, STATUS_COLORS, CURRENCY_SYMBOLS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { InstructorEditForm } from "./edit-form";
import { PayoutForm } from "./payout-form";

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export default async function InstructorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  // Instructors can only see their own page
  if (user.role === "INSTRUCTOR" && user.instructorId !== id) {
    notFound();
  }

  const instructor = await prisma.instructor.findUnique({
    where: { id, isActive: true },
    include: {
      user: true,
      lessons: {
        include: {
          student: { select: { firstName: true, lastName: true } },
          reservation: { select: { lessonType: true, startTime: true } },
          instructorEarning: true,
        },
        orderBy: { checkInTime: "desc" },
        take: 20,
      },
      hizmetler: {
        where: { isActive: true },
        include: { student: { select: { firstName: true, lastName: true } } },
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        take: 30,
      },
      earnings: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      payouts: {
        orderBy: { paidAt: "desc" },
        take: 10,
      },
    },
  });

  if (!instructor) notFound();

  const totalHours = instructor.lessons.reduce((sum, l) => sum + (l.actualHours ?? 0), 0);

  const earningsByCurrency: Record<string, { total: number; paid: number; pending: number }> = {};
  for (const e of instructor.earnings) {
    if (!earningsByCurrency[e.currency]) {
      earningsByCurrency[e.currency] = { total: 0, paid: 0, pending: 0 };
    }
    earningsByCurrency[e.currency].total += e.amount;
    if (e.isPaid) earningsByCurrency[e.currency].paid += e.amount;
    else earningsByCurrency[e.currency].pending += e.amount;
  }

  // New hizmet-based earnings
  const hizmetEarningByCurrency: Record<string, { earned: number; sessions: number }> = {};
  for (const h of instructor.hizmetler) {
    if (h.status === "TAMAMLANDI" && h.instructorEarning) {
      const cur = h.currency;
      if (!hizmetEarningByCurrency[cur]) hizmetEarningByCurrency[cur] = { earned: 0, sessions: 0 };
      hizmetEarningByCurrency[cur].earned += h.instructorEarning;
      hizmetEarningByCurrency[cur].sessions += 1;
    }
  }

  const totalPayouts = instructor.payouts.reduce((sum, p) => sum + p.amount, 0);
  const payoutCurrency = instructor.payouts[0]?.currency ?? instructor.hourlyRateCurrency;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        {user.role !== "INSTRUCTOR" && (
          <Link href="/dashboard/egitmenler">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        )}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: instructor.color }}
          >
            {instructor.user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{instructor.user.name}</h1>
            <p className="text-sm text-gray-500">
              {PAYMENT_MODELS[instructor.paymentModel as keyof typeof PAYMENT_MODELS]}
            </p>
          </div>
        </div>
      </div>

      {/* Bakiye Özeti */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">Bakiye Özeti (Ödenen / Hak Edilen)</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <div>
                <p className="text-xs text-gray-500">Toplam Saat</p>
                <p className="text-xl font-bold text-gray-900">{totalHours.toFixed(1)} saat</p>
              </div>
            </div>
            {Object.entries(earningsByCurrency).map(([currency, data]) => (
              <div key={currency} className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{currency} Bakiyesi</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatMoney(data.paid, currency)} / {formatMoney(data.total, currency)}
                  </p>
                  {data.pending > 0 && (
                    <p className="text-xs text-orange-500">
                      Bekleyen: {formatMoney(data.pending, currency)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hizmet-based earning summary */}
      {Object.keys(hizmetEarningByCurrency).length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 mb-3 font-medium">Hizmet Hakediş Özeti</p>
            <div className="flex flex-wrap gap-6">
              {Object.entries(hizmetEarningByCurrency).map(([currency, data]) => {
                const payoutsInCur = instructor.payouts
                  .filter((p) => p.currency === currency)
                  .reduce((sum, p) => sum + p.amount, 0);
                const net = data.earned - payoutsInCur;
                return (
                  <div key={currency} className="flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">
                        {currency} · {data.sessions} seans
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatMoney(data.earned, currency)}
                      </p>
                      {payoutsInCur > 0 && (
                        <p className="text-xs text-gray-500">
                          Ödenen: {formatMoney(payoutsInCur, currency)} ·{" "}
                          <span className={net > 0 ? "text-orange-500" : "text-green-600"}>
                            Kalan: {formatMoney(net, currency)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout form for admins */}
      {user.role === "ADMIN" && (Object.keys(earningsByCurrency).length > 0 || Object.keys(hizmetEarningByCurrency).length > 0) && (
        <PayoutForm
          instructorId={id}
          currencies={[...new Set([...Object.keys(earningsByCurrency), ...Object.keys(hizmetEarningByCurrency)])]}
        />
      )}

      {/* Recent Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ders & Hakediş Geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {instructor.lessons.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Henüz ders yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tarih & Saat</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Müşteri</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Hizmet</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Hak Ediş Durumu</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Süre</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Maaş</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {instructor.lessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {format(new Date(lesson.checkInTime), "d MMM yyyy", { locale: tr })}
                        <div className="text-xs">
                          {format(new Date(lesson.checkInTime), "HH:mm")}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {lesson.student.firstName} {lesson.student.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {LESSON_TYPES[lesson.reservation.lessonType as keyof typeof LESSON_TYPES]}
                      </td>
                      <td className="px-4 py-2.5">
                        {lesson.instructorEarning ? (
                          lesson.instructorEarning.isPaid ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              Ödendi
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                              Kazanıldı
                            </Badge>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">
                        {lesson.actualHours ? `${lesson.actualHours} saat` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                        {lesson.instructorEarning
                          ? formatMoney(lesson.instructorEarning.amount, lesson.instructorEarning.currency)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hizmet Sessions */}
      {instructor.hizmetler.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              Hizmet Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tarih & Saat</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Müşteri</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Hizmet</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Durum</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Hakediş</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {instructor.hizmetler.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {h.scheduledAt
                          ? format(new Date(h.scheduledAt), "d MMM yyyy", { locale: tr })
                          : format(new Date(h.createdAt), "d MMM yyyy", { locale: tr })}
                        {h.scheduledAt && (
                          <div className="text-xs">
                            {format(new Date(h.scheduledAt), "HH:mm")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {h.student ? `${h.student.firstName} ${h.student.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{h.title}</td>
                      <td className="px-4 py-2.5">
                        {h.status === "TAMAMLANDI" ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">Kazanıldı</Badge>
                        ) : h.status === "DEVAM" ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Devam Ediyor</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Bekliyor</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                        {h.status === "TAMAMLANDI" && h.instructorEarning
                          ? formatMoney(h.instructorEarning, h.currency)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payouts */}
      {instructor.payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ödeme Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {instructor.payouts.map((payout) => (
                <div key={payout.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{formatMoney(payout.amount, payout.currency)}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(payout.paidAt), "d MMM yyyy", { locale: tr })}
                      {payout.notes && ` · ${payout.notes}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{payout.method}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form (Admin only) */}
      {user.role === "ADMIN" && <InstructorEditForm instructor={instructor} />}
    </div>
  );
}
