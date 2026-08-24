import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronLeft,
  UserCheck,
  AlertCircle,
  Phone,
  Mail,
  Globe,
  Clock,
  CreditCard,
  GraduationCap,
  Wrench,
  ShoppingBag,
  ConciergeBell,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SKILL_LEVELS, LESSON_TYPES, CURRENCY_SYMBOLS, PAYMENT_METHODS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { StudentEditForm } from "./edit-form";
import { AssignHizmetDialog } from "./assign-hizmet-dialog";
import { HizmetRowActions } from "./hizmet-row-actions";
import { OdemeDialog } from "./odeme-dialog";

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

const CAT_ICON: Record<string, any> = {
  EGITIM: GraduationCap,
  KIRALAMA: Wrench,
  URUN: ShoppingBag,
};
const CAT_LABEL: Record<string, string> = {
  EGITIM: "Eğitim",
  KIRALAMA: "Kiralama",
  URUN: "Ürün",
};
const STATUS_STYLE: Record<string, string> = {
  BEKLIYOR:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  DEVAM:      "bg-blue-100 text-blue-700 border-blue-200",
  TAMAMLANDI: "bg-green-100 text-green-700 border-green-200",
  IPTAL:      "bg-red-100 text-red-500 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  DEVAM: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal",
};

export default async function MusteriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrReception();
  const { id } = await params;

  const [student, sablonlar, instructors] = await Promise.all([
    prisma.student.findUnique({
      where: { id, isActive: true },
      include: {
        hizmetler: {
          where: { isActive: true },
          include: {
            instructor: { include: { user: { select: { name: true } } } },
          },
          orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        },
        lessons: {
          include: {
            instructor: { include: { user: true } },
            reservation: true,
          },
          orderBy: { checkInTime: "desc" },
          take: 20,
        },
        reservations: {
          where: { isActive: true, lessonType: "EQUIPMENT_RENTAL" },
          include: { instructor: { include: { user: true } } },
          orderBy: { startTime: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
      },
    }),
    prisma.hizmetSablonu.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.instructor.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!student) notFound();

  const totalCharged = student.hizmetler
    .filter((h) => h.status !== "IPTAL")
    .reduce((sum, h) => sum + h.amount, 0);

  const totalPaid = student.payments
    .filter((p) => p.direction === "INCOMING")
    .reduce((sum, p) => sum + p.amount, 0);

  const netBalance = totalPaid - totalCharged;
  const defaultCurrency = student.hizmetler[0]?.currency ?? "EUR";

  const lessons = student.lessons.filter(
    (l) => l.reservation.lessonType !== "EQUIPMENT_RENTAL"
  );

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/musteriler">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              {SKILL_LEVELS[student.skillLevel as keyof typeof SKILL_LEVELS]}
            </Badge>
            {student.waiverSigned ? (
              <span className="flex items-center gap-1 text-green-600 text-xs">
                <UserCheck className="w-3.5 h-3.5" /> Feragatname İmzalı
              </span>
            ) : (
              <span className="flex items-center gap-1 text-orange-500 text-xs">
                <AlertCircle className="w-3.5 h-3.5" /> Feragatname Bekleniyor
              </span>
            )}
          </div>
        </div>
        <OdemeDialog studentId={student.id} />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Toplam Borç
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoney(totalCharged, defaultCurrency)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{student.hizmetler.filter(h => h.status !== "IPTAL").length} hizmet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" /> Toplam Ödenen
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoney(totalPaid, defaultCurrency)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{student.payments.filter(p => p.direction === "INCOMING").length} ödeme</p>
          </CardContent>
        </Card>
        <Card className={netBalance < -0.01 ? "border-red-200 bg-red-50" : netBalance > 0.01 ? "border-blue-200 bg-blue-50" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Net Bakiye
            </div>
            <p className={`text-2xl font-bold ${netBalance < -0.01 ? "text-red-600" : netBalance > 0.01 ? "text-blue-600" : "text-green-600"}`}>
              {netBalance >= 0 ? "+" : ""}{formatMoney(netBalance, defaultCurrency)}
            </p>
            <p className="text-xs mt-0.5">
              {netBalance < -0.01 ? (
                <span className="text-red-500">Borç var</span>
              ) : netBalance > 0.01 ? (
                <span className="text-blue-500">Fazla ödeme</span>
              ) : (
                <span className="text-green-500">Hesap kapalı</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">İletişim Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {student.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" /> {student.phone}
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" /> {student.email}
              </div>
            )}
            {student.nationality && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-4 h-4 text-gray-400" /> {student.nationality}
                {student.language && ` • ${student.language}`}
              </div>
            )}
            {student.emergencyContact && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-400 mb-1">Acil Durum</p>
                <p className="font-medium">{student.emergencyContact}</p>
                {student.emergencyPhone && (
                  <p className="text-gray-500">{student.emergencyPhone}</p>
                )}
              </div>
            )}
            {student.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-400 mb-1">Notlar</p>
                <p className="text-gray-600">{student.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Hizmetler */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ConciergeBell className="w-4 h-4 text-blue-500" />
                  Hizmetler
                </CardTitle>
                <AssignHizmetDialog
                  studentId={student.id}
                  sablonlar={sablonlar}
                  instructors={instructors}
                />
              </div>
            </CardHeader>
            <CardContent>
              {student.hizmetler.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Henüz hizmet eklenmemiş</p>
              ) : (
                <div className="divide-y">
                  {student.hizmetler.map((h) => {
                    const Icon = CAT_ICON[h.category] ?? ConciergeBell;
                    const symbol = CURRENCY_SYMBOLS[h.currency as keyof typeof CURRENCY_SYMBOLS] ?? h.currency;
                    return (
                      <div key={h.id} className="py-3 flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-gray-100 text-gray-500 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{h.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span>{CAT_LABEL[h.category]}</span>
                            {h.instructor && <span>· {h.instructor.user.name}</span>}
                            {h.scheduledAt && (
                              <span>· {format(new Date(h.scheduledAt), "d MMM HH:mm", { locale: tr })}</span>
                            )}
                            {h.checkedInAt && (
                              <span className="text-blue-500">
                                · Giriş: {format(new Date(h.checkedInAt), "HH:mm")}
                              </span>
                            )}
                            {h.checkedOutAt && (
                              <span className="text-green-600">
                                · Çıkış: {format(new Date(h.checkedOutAt), "HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {h.amount > 0 && (
                            <p className="text-sm font-semibold text-gray-900">{symbol}{h.amount.toFixed(2)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`text-xs ${STATUS_STYLE[h.status] ?? ""}`}>
                            {STATUS_LABEL[h.status] ?? h.status}
                          </Badge>
                          <HizmetRowActions id={h.id} studentId={student.id} status={h.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          {student.payments.filter(p => p.direction === "INCOMING").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  Ödeme Geçmişi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {student.payments
                    .filter((p) => p.direction === "INCOMING")
                    .map((pay) => {
                      const symbol = CURRENCY_SYMBOLS[pay.currency as keyof typeof CURRENCY_SYMBOLS] ?? pay.currency;
                      return (
                        <div key={pay.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {symbol}{pay.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(pay.recordedAt), "d MMM yyyy HH:mm", { locale: tr })}
                              {pay.description && ` · ${pay.description}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                            {PAYMENT_METHODS[pay.method as keyof typeof PAYMENT_METHODS]}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lesson History (from Rezervasyonlar flow) */}
          {lessons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-green-600" />
                  Ders Geçmişi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {lesson.instructor.user.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {LESSON_TYPES[lesson.reservation.lessonType as keyof typeof LESSON_TYPES]}
                            {" · "}
                            {format(new Date(lesson.checkInTime), "d MMM yyyy HH:mm", { locale: tr })}
                          </p>
                        </div>
                        <div>
                          {lesson.checkOutTime ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                              {lesson.actualHours?.toFixed(1)} saat
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                              Devam ediyor
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment Rentals */}
          {student.reservations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  Ekipman Kiralamaları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {student.reservations.map((res) => (
                    <div key={res.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{res.instructor.user.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(res.startTime), "d MMM yyyy HH:mm", { locale: tr })}
                          {" · "}{res.plannedHours} saat
                        </p>
                      </div>
                      <Badge variant="outline" className={
                        res.status === "COMPLETED" ? "bg-green-100 text-green-700 border-green-200 text-xs"
                        : res.status === "CHECKED_IN" ? "bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"
                        : "bg-gray-100 text-gray-600 border-gray-200 text-xs"
                      }>
                        {res.status === "COMPLETED" ? "Tamamlandı"
                          : res.status === "CHECKED_IN" ? "Devam Ediyor"
                          : "Planlandı"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <StudentEditForm student={student} />
    </div>
  );
}
