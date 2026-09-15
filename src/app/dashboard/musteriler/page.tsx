import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Search,
  UserCheck,
  AlertCircle,
  Users,
  UserPlus,
  CalendarCheck,
} from "lucide-react";
import { SKILL_LEVELS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CustomerRow } from "./customer-row";
import { MusterilerFilters } from "./filters";
import { NewStudentSheet } from "./new-student-sheet";
import { toTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

const AVATAR_COLORS = [
  "bg-warning/15 text-warning",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-info/15 text-info",
  "bg-destructive/15 text-destructive",
];

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seviye?: string; durum?: string }>;
}) {
  await requireAdminOrReception();
  const params = await searchParams;
  const q = params.q ?? "";
  const seviye = params.seviye ?? "";
  const durum = params.durum ?? "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [totalStudents, newStudents, todayReservationsRaw, students] = await Promise.all([
    prisma.student.count({ where: { isActive: true } }),
    prisma.student.count({ where: { isActive: true, createdAt: { gte: sevenDaysAgo } } }),
    prisma.reservation.findMany({
      where: {
        isActive: true,
        startTime: { gte: today, lt: tomorrow },
        status: { notIn: ["CANCELLED", "WIND_CANCELLED"] },
      },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.student.findMany({
      where: {
        isActive: true,
        AND: [
          q ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          } : {},
          seviye ? { skillLevel: seviye } : {},
        ],
      },
      include: {
        payments: { select: { amount: true, direction: true, currency: true } },
        hizmetler: {
          where: { isActive: true, status: { not: "IPTAL" } },
          select: { amount: true, currency: true, scheduledAt: true, createdAt: true },
          orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        },
        packagePurchases: {
          where: { isActive: true },
          select: { remainingHours: true, expiresAt: true, purchasePrice: true, currency: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const rates = await getExchangeRates();

  const todayReservationStudents = Array.from(
    new Map(todayReservationsRaw.map((r) => [r.student.id, r.student])).values()
  );

  const enriched = students.map((s) => {
    // Farklı para birimlerindeki işlemler TL'ye çevrilip toplanır.
    const totalCharged =
      s.hizmetler.reduce((sum, h) => sum + toTRY(h.amount, h.currency, rates), 0) +
      s.packagePurchases.reduce((sum, p) => sum + toTRY(p.purchasePrice, p.currency, rates), 0);
    const totalPaid = s.payments
      .filter((p) => p.direction === "INCOMING")
      .reduce((sum, p) => sum + toTRY(p.amount, p.currency, rates), 0);
    const netBalance = totalPaid - totalCharged;
    const lastService = s.hizmetler[0]?.scheduledAt ?? s.hizmetler[0]?.createdAt;
    const now = new Date();
    const packageHoursLeft = s.packagePurchases
      .filter((p) => p.remainingHours > 0 && (!p.expiresAt || p.expiresAt > now))
      .reduce((sum, p) => sum + p.remainingHours, 0);
    return { ...s, totalCharged, totalPaid, netBalance, lastService, packageHoursLeft };
  });

  const filtered = durum
    ? enriched.filter((s) => {
        if (durum === "borc") return s.netBalance < -0.01;
        if (durum === "temiz") return s.netBalance >= -0.01;
        return true;
      })
    : enriched;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Müşteriler</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} müşteri</p>
        </div>
        <NewStudentSheet />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-5 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground/85">Toplam Müşteri</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalStudents}</p>
          </div>
          <span className="text-xs text-muted-foreground/70">Tüm müşteri profilleri</span>
        </div>

        <div className="bg-card rounded-xl border p-5 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-info" />
              </div>
              <span className="text-sm font-medium text-foreground/85">Yeni Müşteriler</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{newStudents}</p>
          </div>
          <Badge variant="outline" className="text-xs bg-muted/40 text-muted-foreground border-border">
            Son 7 gün
          </Badge>
        </div>

        <div className="bg-card rounded-xl border p-5 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-info" />
              </div>
              <span className="text-sm font-medium text-foreground/85">Bugün Rezervasyonu Olanlar</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{todayReservationStudents.length}</p>
          </div>
          {todayReservationStudents.length > 0 && (
            <AvatarGroup>
              {todayReservationStudents.slice(0, 4).map((s, i) => (
                <Avatar key={s.id} size="sm">
                  <AvatarFallback className={AVATAR_COLORS[i % AVATAR_COLORS.length]}>
                    {(s.firstName[0] ?? "") + (s.lastName[0] ?? "")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {todayReservationStudents.length > 4 && (
                <AvatarGroupCount>+{todayReservationStudents.length - 4}</AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>
      </div>

      {/* Filters */}
      <MusterilerFilters q={q} seviye={seviye} durum={durum} />

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Müşteri Listesi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/70">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Müşteri bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Müşteri</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">İletişim</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Son Hizmet</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ödeme Durumu</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ödenen / Borç</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((student) => {
                    const hasDebt = student.netBalance < -0.01;
                    const hasSurplus = student.netBalance > 0.01;

                    return (
                      <CustomerRow key={student.id} href={`/dashboard/musteriler/${student.id}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {SKILL_LEVELS[student.skillLevel as keyof typeof SKILL_LEVELS]}
                            </Badge>
                            {student.waiverSigned ? (
                              <span className="flex items-center gap-1 text-success text-xs">
                                <UserCheck className="w-3 h-3" /> Feragatname
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-warning text-xs">
                                <AlertCircle className="w-3 h-3" /> Bekliyor
                              </span>
                            )}
                            {student.packageHoursLeft > 0 && (
                              <Badge variant="outline" className="text-xs bg-info/15 text-info border-info/30">
                                {student.packageHoursLeft % 1 === 0 ? student.packageHoursLeft : student.packageHoursLeft.toFixed(1)} sa paket
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {student.phone ?? "—"}
                          {student.email && (
                            <div className="text-xs text-muted-foreground/70">{student.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {student.lastService
                            ? format(new Date(student.lastService), "d MMM yyyy", { locale: tr })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {student.totalCharged === 0 ? (
                            <span className="text-muted-foreground/70 text-xs">Hizmet yok</span>
                          ) : hasDebt ? (
                            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
                              Borç Var
                            </Badge>
                          ) : hasSurplus ? (
                            <Badge variant="outline" className="bg-info/15 text-info border-info/30">
                              Fazla Ödeme
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                              Ödenmiş
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {student.totalCharged > 0 ? (
                            <div>
                              <span className="text-success font-medium">
                                ₺{student.totalPaid.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground/70 mx-1">/</span>
                              <span className={hasDebt ? "text-destructive font-semibold" : "text-foreground/85"}>
                                ₺{student.totalCharged.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/70">—</span>
                          )}
                        </td>
                      </CustomerRow>
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
