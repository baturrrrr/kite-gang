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
  ConciergeBell,
  TrendingDown,
  TrendingUp,
  Wallet,
  PackageCheck,
  Cake,
  Weight,
} from "lucide-react";
import { SKILL_LEVELS, LESSON_TYPES, PAYMENT_METHODS, EQUIPMENT_TYPES, GENDER_OPTIONS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { StudentEditForm } from "./edit-form";
import { AssignHizmetDialog } from "./assign-hizmet-dialog";
import { HizmetDetailDialog } from "./hizmet-detail-dialog";
import { OdemeDialog } from "./odeme-dialog";
import { formatTRY, toTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";


export default async function MusteriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrReception();
  const { id } = await params;

  const [student, sablonlar, instructors, equipment, cashAccounts] = await Promise.all([
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
          include: {
            instructor: { include: { user: true } },
            equipment: { select: { type: true, name: true, size: true } },
          },
          orderBy: { startTime: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        packagePurchases: {
          where: { isActive: true },
          include: { package: { select: { name: true } } },
          orderBy: { purchasedAt: "desc" },
        },
      },
    }),
    prisma.hizmetSablonu.findMany({
      where: { isActive: true },
      include: { fiyatlar: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
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
    prisma.cashAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) notFound();

  const rates = await getExchangeRates();

  // Farklı para birimlerindeki işlemler TL'ye çevrilip toplanır.
  const totalCharged =
    student.hizmetler
      .filter((h) => h.status !== "IPTAL")
      .reduce((sum, h) => sum + toTRY(h.amount, h.currency, rates), 0) +
    student.packagePurchases.reduce((sum, p) => sum + toTRY(p.purchasePrice, p.currency, rates), 0);

  const totalPaid = student.payments
    .filter((p) => p.direction === "INCOMING")
    .reduce((sum, p) => sum + toTRY(p.amount, p.currency, rates), 0);

  const netBalance = totalPaid - totalCharged;

  const lessons = student.lessons.filter(
    (l) => l.reservation.lessonType !== "EQUIPMENT_RENTAL"
  );

  const hizmetOptions = student.hizmetler
    .filter((h) => h.status !== "IPTAL")
    .map((h) => ({
      id: h.id,
      title: h.title,
      amount: h.amount,
      currency: h.currency,
      instructorEarning: h.instructorEarning,
      instructorName: h.instructor?.user.name ?? null,
    }));

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
        <OdemeDialog studentId={student.id} hizmetler={hizmetOptions} cashAccounts={cashAccounts} />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Toplam Borç
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ₺{totalCharged.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {student.hizmetler.filter(h => h.status !== "IPTAL").length} hizmet
              {student.packagePurchases.length > 0 && `, ${student.packagePurchases.length} paket`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" /> Toplam Ödenen
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ₺{totalPaid.toFixed(2)}
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
              {netBalance >= 0 ? "+" : ""}₺{netBalance.toFixed(2)}
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
            {student.birthDate && (
              <div className="flex items-center gap-2 text-gray-600">
                <Cake className="w-4 h-4 text-gray-400" />
                {format(new Date(student.birthDate), "d MMM yyyy", { locale: tr })}
              </div>
            )}
            {(student.weight || student.gender) && (
              <div className="flex items-center gap-2 text-gray-600">
                <Weight className="w-4 h-4 text-gray-400" />
                {student.weight ? `${student.weight} kg` : ""}
                {student.weight && student.gender ? " · " : ""}
                {student.gender ? GENDER_OPTIONS[student.gender as keyof typeof GENDER_OPTIONS] : ""}
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
                  equipment={equipment}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {student.hizmetler.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Henüz hizmet eklenmemiş</p>
              ) : (
                <div>
                  {/* Tablo başlığı */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr auto auto auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      background: "#f9fafb",
                    }}
                  >
                    <div />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hizmet</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Kategori</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Durum</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Tutar</span>
                  </div>
                  {/* Satırlar */}
                  {student.hizmetler.map((h) => (
                    <HizmetDetailDialog
                      key={h.id}
                      hizmet={h}
                      studentId={student.id}
                      instructors={instructors}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package Hours — only rendered for students who purchased a package */}
          {student.packagePurchases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-violet-500" />
                  Paket Hakları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {student.packagePurchases.map((purchase) => {
                    const now = new Date();
                    const isExpired = purchase.expiresAt ? purchase.expiresAt < now : false;
                    const isDepleted = purchase.remainingHours <= 0;
                    const pct = purchase.totalHours > 0
                      ? Math.max(0, Math.min(100, (purchase.remainingHours / purchase.totalHours) * 100))
                      : 0;

                    return (
                      <div key={purchase.id} className="py-3">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <p className="text-sm font-medium text-gray-900">{purchase.package.name}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isExpired
                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                : isDepleted
                                ? "bg-red-100 text-red-600 border-red-200"
                                : "bg-violet-100 text-violet-700 border-violet-200"
                            }`}
                          >
                            {isExpired ? "Süresi Doldu" : isDepleted ? "Tükendi" : "Aktif"}
                          </Badge>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isExpired || isDepleted ? "bg-gray-300" : "bg-violet-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                          <span>
                            {purchase.remainingHours.toFixed(1)} / {purchase.totalHours.toFixed(1)} saat kaldı
                          </span>
                          <span>
                            {formatTRY(purchase.purchasePrice, purchase.currency, rates)}
                            {purchase.expiresAt && ` · ${format(new Date(purchase.expiresAt), "d MMM yyyy", { locale: tr })}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
                      return (
                        <div key={pay.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTRY(pay.amount, pay.currency, rates)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(pay.recordedAt), "d MMM yyyy HH:mm", { locale: tr })}
                              {pay.description && ` · ${pay.description}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                              {PAYMENT_METHODS[pay.method as keyof typeof PAYMENT_METHODS]}
                            </Badge>
                          </div>
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
                            {lesson.instructor?.user.name ?? "Personel atanmadı"}
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
                        <p className="text-sm font-medium">
                          {res.equipment
                            ? `${EQUIPMENT_TYPES[res.equipment.type as keyof typeof EQUIPMENT_TYPES] ?? res.equipment.type} — ${res.equipment.name}${res.equipment.size ? ` (${res.equipment.size})` : ""}`
                            : "Ekipman Kiralama"}
                          {res.rentalAmount != null && (
                            <span className="text-gray-500 font-normal">
                              {" · "}{formatTRY(res.rentalAmount, res.rentalCurrency ?? "TRY", rates)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(res.startTime), "d MMM yyyy HH:mm", { locale: tr })}
                          {" · "}{res.plannedHours} saat
                          {res.instructor && ` · ${res.instructor.user.name}`}
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
