import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_TYPES } from "@/lib/constants";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { Users, Clock, Wallet, GraduationCap, Wrench, Package } from "lucide-react";
import { PeriodNav } from "./period-nav";
import Link from "next/link";
import { convertAmount, formatTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

type Session = {
  date: Date;
  instructorId: string | null;
  studentName: string;
  title: string;
  amount: number;
  currency: string;
  hours: number | null;
  earned: boolean;
};

type Rental = {
  date: Date;
  equipmentKey: string;
  studentName: string;
  title: string;
  amount: number;
  currency: string;
  earned: boolean;
};

export default async function PerformansOzetiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  await requireAdminOrReception();
  const params = await searchParams;
  const period = params.period === "haftalik" ? "haftalik" : "gunluk";
  const anchorDate = params.date ? new Date(params.date + "T00:00:00") : new Date();

  const rangeStart = period === "gunluk" ? startOfDay(anchorDate) : startOfWeek(anchorDate, { weekStartsOn: 1 });
  const rangeEnd = period === "gunluk" ? endOfDay(anchorDate) : endOfWeek(anchorDate, { weekStartsOn: 1 });

  const label =
    period === "gunluk"
      ? format(anchorDate, "d MMMM yyyy, EEEE", { locale: tr })
      : `${format(rangeStart, "d MMM", { locale: tr })} – ${format(rangeEnd, "d MMM yyyy", { locale: tr })}`;

  const dateFilter = {
    OR: [
      { scheduledAt: { gte: rangeStart, lte: rangeEnd } },
      { scheduledAt: null, createdAt: { gte: rangeStart, lte: rangeEnd } },
    ],
  };

  const [lessons, hizmetler, instructors, kiralamalar, equipmentList, randevuKiralamalari, rates] = await Promise.all([
    prisma.lesson.findMany({
      where: { checkInTime: { gte: rangeStart, lte: rangeEnd } },
      include: {
        student: { select: { firstName: true, lastName: true } },
        instructor: { include: { user: { select: { name: true } } } },
        instructorEarning: true,
      },
    }),
    prisma.hizmet.findMany({
      where: { category: "EGITIM", isActive: true, instructorId: { not: null }, ...dateFilter },
      include: {
        student: { select: { firstName: true, lastName: true } },
        instructor: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.instructor.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.hizmet.findMany({
      where: { category: "KIRALAMA", isActive: true, ...dateFilter },
      include: {
        student: { select: { firstName: true, lastName: true } },
        equipment: { select: { id: true, type: true, name: true, size: true } },
      },
    }),
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, type: true, name: true, size: true },
    }),
    prisma.reservation.findMany({
      where: { lessonType: "EQUIPMENT_RENTAL", isActive: true, startTime: { gte: rangeStart, lte: rangeEnd } },
      include: {
        student: { select: { firstName: true, lastName: true } },
        equipment: { select: { id: true, type: true, name: true, size: true } },
      },
    }),
    getExchangeRates(),
  ]);

  // Farklı para birimlerindeki tüm tutarlar tutarlılık için TL'ye çevrilerek gösterilir.
  const toTRY = (amount: number, currency: string) => convertAmount(amount, currency, "TRY", rates);
  const formatMoney = (amount: number, currency: string) => formatTRY(amount, currency, rates);

  // ─── Eğitmen dersleri ───────────────────────────────────────────────────────

  const sessions: Session[] = [];

  for (const l of lessons) {
    if (!l.instructor) continue;
    sessions.push({
      date: l.checkInTime,
      instructorId: l.instructorId,
      studentName: `${l.student.firstName} ${l.student.lastName}`,
      title: "Ders",
      amount: l.instructorEarning?.amount ?? 0,
      currency: l.instructorEarning?.currency ?? l.instructor.hourlyRateCurrency,
      hours: l.actualHours,
      earned: !!l.instructorEarning,
    });
  }

  for (const h of hizmetler) {
    if (!h.instructor || !h.student) continue;
    sessions.push({
      date: h.scheduledAt ?? h.createdAt,
      instructorId: h.instructorId!,
      studentName: `${h.student.firstName} ${h.student.lastName}`,
      title: h.title,
      amount: h.status === "TAMAMLANDI" ? h.instructorEarning ?? 0 : 0,
      currency: h.currency,
      hours: null,
      earned: h.status === "TAMAMLANDI" && !!h.instructorEarning,
    });
  }

  sessions.sort((a, b) => b.date.getTime() - a.date.getTime());

  type InstructorStat = {
    id: string;
    name: string;
    color: string;
    sessions: Session[];
    totalHours: number;
    earningsTRY: number;
    studentCounts: Record<string, number>;
  };

  const byInstructor = new Map<string, InstructorStat>();
  for (const inst of instructors) {
    byInstructor.set(inst.id, {
      id: inst.id,
      name: inst.user.name,
      color: inst.color,
      sessions: [],
      totalHours: 0,
      earningsTRY: 0,
      studentCounts: {},
    });
  }

  let grandEarningsTRY = 0;

  for (const s of sessions) {
    if (!s.instructorId) continue;
    const stat = byInstructor.get(s.instructorId);
    if (!stat) continue;
    stat.sessions.push(s);
    if (s.hours) stat.totalHours += s.hours;
    stat.studentCounts[s.studentName] = (stat.studentCounts[s.studentName] ?? 0) + 1;
    if (s.earned && s.amount > 0) {
      const amountTRY = toTRY(s.amount, s.currency);
      stat.earningsTRY += amountTRY;
      grandEarningsTRY += amountTRY;
    }
  }

  const instructorStats = [...byInstructor.values()].sort((a, b) => b.sessions.length - a.sessions.length);
  const activeInstructorStats = instructorStats.filter((s) => s.sessions.length > 0);
  const emptyInstructorStats = instructorStats.filter((s) => s.sessions.length === 0);

  // ─── Ekipman kiralamaları ───────────────────────────────────────────────────

  const UNASSIGNED_KEY = "__unassigned__";

  const rentals: Rental[] = kiralamalar.map((h) => ({
    date: h.scheduledAt ?? h.createdAt,
    equipmentKey: h.equipment?.id ?? UNASSIGNED_KEY,
    studentName: h.student ? `${h.student.firstName} ${h.student.lastName}` : "—",
    title: h.title,
    amount: h.status === "TAMAMLANDI" ? h.amount : 0,
    currency: h.currency,
    earned: h.status === "TAMAMLANDI",
  }));

  for (const r of randevuKiralamalari) {
    rentals.push({
      date: r.startTime,
      equipmentKey: r.equipment?.id ?? UNASSIGNED_KEY,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      title: "Ekipman Kiralama (Randevu)",
      amount: r.status === "COMPLETED" ? r.rentalAmount ?? 0 : 0,
      currency: r.rentalCurrency ?? "TRY",
      earned: r.status === "COMPLETED",
    });
  }

  rentals.sort((a, b) => b.date.getTime() - a.date.getTime());

  type EquipmentStat = {
    id: string;
    name: string;
    rentals: Rental[];
    revenueTRY: number;
  };

  const byEquipment = new Map<string, EquipmentStat>();
  for (const eq of equipmentList) {
    const typeLabel = EQUIPMENT_TYPES[eq.type as keyof typeof EQUIPMENT_TYPES] ?? eq.type;
    byEquipment.set(eq.id, {
      id: eq.id,
      name: `${typeLabel} — ${eq.name}${eq.size ? ` (${eq.size})` : ""}`,
      rentals: [],
      revenueTRY: 0,
    });
  }
  byEquipment.set(UNASSIGNED_KEY, {
    id: UNASSIGNED_KEY,
    name: "Belirtilmemiş / Genel Kiralama",
    rentals: [],
    revenueTRY: 0,
  });

  let grandRentalRevenueTRY = 0;

  for (const r of rentals) {
    let stat = byEquipment.get(r.equipmentKey);
    if (!stat) {
      // Equipment was deactivated after the rental was recorded
      stat = { id: r.equipmentKey, name: "Silinmiş / Pasif Ekipman", rentals: [], revenueTRY: 0 };
      byEquipment.set(r.equipmentKey, stat);
    }
    stat.rentals.push(r);
    if (r.earned && r.amount > 0) {
      const amountTRY = toTRY(r.amount, r.currency);
      stat.revenueTRY += amountTRY;
      grandRentalRevenueTRY += amountTRY;
    }
  }

  const equipmentStats = [...byEquipment.values()].sort((a, b) => b.rentals.length - a.rentals.length);
  const activeEquipmentStats = equipmentStats.filter((s) => s.rentals.length > 0);
  const emptyEquipmentStats = equipmentStats.filter((s) => s.rentals.length === 0 && s.id !== UNASSIGNED_KEY);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl leading-[0.95] font-extrabold lg:text-[56px]">Performans Özeti</h1>
          <p className="text-muted-foreground text-sm mt-1">Eğitmenlerin ders performansı ve ekipman kiralama gelirleri</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-md overflow-hidden">
            <Link
              href={`/dashboard/performans-ozeti?period=gunluk&date=${format(anchorDate, "yyyy-MM-dd")}`}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                period === "gunluk" ? "bg-info text-background" : "bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              Günlük
            </Link>
            <Link
              href={`/dashboard/performans-ozeti?period=haftalik&date=${format(anchorDate, "yyyy-MM-dd")}`}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                period === "haftalik" ? "bg-info text-background" : "bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              Haftalık
            </Link>
          </div>
          <PeriodNav period={period} date={format(anchorDate, "yyyy-MM-dd")} label={label} />
        </div>
      </div>

      {/* Grand Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <GraduationCap className="w-3.5 h-3.5" /> Toplam Ders
            </div>
            <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Aktif Eğitmen
            </div>
            <p className="text-2xl font-bold text-foreground">{activeInstructorStats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Wrench className="w-3.5 h-3.5" /> Toplam Kiralama
            </div>
            <p className="text-2xl font-bold text-foreground">{rentals.length}</p>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-success text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Eğitmen Kazancı
            </div>
            <p className="text-2xl font-bold text-success">
              {grandEarningsTRY > 0 ? formatMoney(grandEarningsTRY, "TRY") : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-warning text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Kiralama Geliri
            </div>
            <p className="text-2xl font-bold text-warning">
              {grandRentalRevenueTRY > 0 ? formatMoney(grandRentalRevenueTRY, "TRY") : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-instructor breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Eğitmenler</h2>
        {activeInstructorStats.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground/70 border rounded-lg">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Bu dönemde ders kaydı yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeInstructorStats.map((stat) => (
              <Card key={stat.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                        style={{ backgroundColor: stat.color }}
                      >
                        {stat.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{stat.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" /> {stat.sessions.length} ders
                          </span>
                          {stat.totalHours > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {stat.totalHours.toFixed(1)} saat
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {stat.earningsTRY > 0 ? (
                        <Badge className="bg-success/15 text-success border-success/30">
                          {formatMoney(stat.earningsTRY, "TRY")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Kazanç yok</Badge>
                      )}
                    </div>
                  </div>

                  {/* Students summary */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(stat.studentCounts).map(([student, count]) => (
                      <span
                        key={student}
                        className="text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1"
                      >
                        {student} {count > 1 ? `×${count}` : ""}
                      </span>
                    ))}
                  </div>

                  {/* Session detail table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tarih & Saat</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Öğrenci</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ders</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stat.sessions.map((s, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {format(new Date(s.date), "d MMM, HH:mm", { locale: tr })}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground">{s.studentName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{s.title}</td>
                            <td className="px-3 py-2 text-right font-semibold text-foreground">
                              {s.earned && s.amount > 0 ? formatMoney(s.amount, s.currency) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

            {emptyInstructorStats.length > 0 && (
              <p className="text-xs text-muted-foreground/70 px-1">
                Bu dönemde dersi olmayan eğitmenler: {emptyInstructorStats.map((s) => s.name).join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Per-equipment breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ekipman Kiralamaları</h2>
        {activeEquipmentStats.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground/70 border rounded-lg">
            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Bu dönemde kiralama kaydı yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeEquipmentStats.map((stat) => (
              <Card key={stat.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center text-warning flex-shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{stat.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> {stat.rentals.length} kiralama
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {stat.revenueTRY > 0 ? (
                        <Badge className="bg-warning/15 text-warning border-warning/30">
                          {formatMoney(stat.revenueTRY, "TRY")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Gelir yok</Badge>
                      )}
                    </div>
                  </div>

                  {/* Rental detail table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tarih & Saat</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Müşteri</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Hizmet</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stat.rentals.map((r, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {format(new Date(r.date), "d MMM, HH:mm", { locale: tr })}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground">{r.studentName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.title}</td>
                            <td className="px-3 py-2 text-right font-semibold text-foreground">
                              {r.earned && r.amount > 0 ? formatMoney(r.amount, r.currency) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

            {emptyEquipmentStats.length > 0 && (
              <p className="text-xs text-muted-foreground/70 px-1">
                Bu dönemde kiralanmayan ekipmanlar: {emptyEquipmentStats.map((s) => s.name).join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
