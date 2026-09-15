import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronRight, CircleAlert, FileCheck, Package, Search, Users, Wallet, CalendarCheck } from "lucide-react";
import { SKILL_LEVELS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CustomerRow } from "./customer-row";
import { MusterilerFilters } from "./filters";
import { NewStudentSheet } from "./new-student-sheet";
import { formatTL, toTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Pill } from "@/components/layout/pill";
import { initialsOf } from "@/components/layout/nav-config";

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

  const [totalStudents, todayReservationsRaw, students] = await Promise.all([
    prisma.student.count({ where: { isActive: true } }),
    prisma.reservation.findMany({
      where: {
        isActive: true,
        startTime: { gte: today, lt: tomorrow },
        status: { notIn: ["CANCELLED", "WIND_CANCELLED"] },
      },
      select: { studentId: true },
    }),
    prisma.student.findMany({
      where: {
        isActive: true,
        AND: [
          q
            ? {
                OR: [
                  { firstName: { contains: q } },
                  { lastName: { contains: q } },
                  { email: { contains: q } },
                  { phone: { contains: q } },
                ],
              }
            : {},
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
  const todayReservationCount = new Set(todayReservationsRaw.map((r) => r.studentId)).size;

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

  const debtors = enriched.filter((s) => s.netBalance < -0.01);
  const openDebt = debtors.reduce((sum, s) => sum - s.netBalance, 0);

  const status = (s: (typeof enriched)[number]) => {
    if (s.totalCharged === 0) return <Pill>Hizmet yok</Pill>;
    if (s.netBalance < -0.01) return <Pill tone="danger">Borç var</Pill>;
    if (s.netBalance > 0.01) return <Pill tone="info">Fazla ödeme</Pill>;
    return <Pill tone="success">Ödendi</Pill>;
  };

  const badges = (s: (typeof enriched)[number]) => (
    <div className="flex flex-wrap gap-1.5">
      <Pill className="h-5 text-[11px]">{SKILL_LEVELS[s.skillLevel as keyof typeof SKILL_LEVELS] ?? s.skillLevel}</Pill>
      {s.waiverSigned ? (
        <Pill tone="success" className="h-5 text-[11px]">
          <FileCheck />
          Feragatname
        </Pill>
      ) : (
        <Pill tone="warning" className="h-5 text-[11px]">
          <CircleAlert />
          Feragatname bekliyor
        </Pill>
      )}
      {s.packageHoursLeft > 0 && (
        <Pill tone="info" className="h-5 text-[11px]">
          <Package />
          {s.packageHoursLeft.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sa paket
        </Pill>
      )}
    </div>
  );

  const money = (s: (typeof enriched)[number]) =>
    s.totalCharged > 0 ? (
      <span className="num text-lg whitespace-nowrap">
        <span className="font-semibold">{formatTL(s.totalPaid)}</span>
        <span className="text-muted-foreground/60"> / </span>
        <span className={s.netBalance < -0.01 ? "font-bold text-destructive" : "font-semibold text-muted-foreground"}>
          {formatTL(s.totalCharged)}
        </span>
      </span>
    ) : (
      <span className="text-muted-foreground/60">—</span>
    );

  const avatar = (s: (typeof enriched)[number]) => (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-muted text-xs font-extrabold text-foreground/80">
      {initialsOf(`${s.firstName} ${s.lastName}`)}
    </div>
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader eyebrow="Yönetim" title="Müşteriler" count={filtered.length} actions={<NewStudentSheet />} />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3.5">
        <StatCard label="Aktif müşteri" icon={Users} value={totalStudents} />
        <StatCard label="Bugün rezervasyonu olan" icon={CalendarCheck} value={todayReservationCount} />
        <StatCard
          className="col-span-2 lg:col-span-1"
          label={`Açık borç · ${debtors.length} müşteri`}
          icon={Wallet}
          tone={openDebt > 0 ? "danger" : "default"}
          value={formatTL(openDebt)}
        />
      </div>

      <MusterilerFilters q={q} seviye={seviye} durum={durum} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-14 text-center">
          <Search className="size-7 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-muted-foreground">Müşteri bulunamadı</p>
        </div>
      ) : (
        <>
          {/* Masaüstü: tablo */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="h-11 text-left text-[11px] font-bold tracking-[0.12em] whitespace-nowrap text-muted-foreground/70 uppercase">
                    <th className="px-5 font-bold">Müşteri</th>
                    <th className="px-4 font-bold">İletişim</th>
                    <th className="px-4 font-bold">Son hizmet</th>
                    <th className="px-4 font-bold">Durum</th>
                    <th className="px-4 text-right font-bold">Ödenen / Toplam</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <CustomerRow key={student.id} href={`/dashboard/musteriler/${student.id}`}>
                      <td className="border-t border-border px-5 py-3">
                        <div className="flex items-center gap-3">
                          {avatar(student)}
                          <div className="min-w-0 space-y-1.5">
                            <p className="truncate text-[15px] font-bold">
                              {student.firstName} {student.lastName}
                            </p>
                            {badges(student)}
                          </div>
                        </div>
                      </td>
                      <td className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
                        {student.phone && <p>{student.phone}</p>}
                        {student.email && <p className="text-muted-foreground/70">{student.email}</p>}
                        {!student.phone && !student.email && "—"}
                      </td>
                      <td className="border-t border-border px-4 py-3 text-[13px] whitespace-nowrap text-muted-foreground">
                        {student.lastService ? format(student.lastService, "d MMM yyyy", { locale: tr }) : "—"}
                      </td>
                      <td className="border-t border-border px-4 py-3">{status(student)}</td>
                      <td className="border-t border-border px-4 py-3 text-right">{money(student)}</td>
                      <td className="border-t border-border pr-4 text-muted-foreground/60">
                        <ChevronRight className="size-4" />
                      </td>
                    </CustomerRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Telefon: kart listesi */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((student) => (
              <Link
                key={student.id}
                href={`/dashboard/musteriler/${student.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 active:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  {avatar(student)}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-bold">
                        {student.firstName} {student.lastName}
                      </p>
                      {status(student)}
                    </div>
                    {badges(student)}
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    <p className="truncate">{student.phone ?? student.email ?? "İletişim yok"}</p>
                    <p>Son hizmet: {student.lastService ? format(student.lastService, "d MMM yyyy", { locale: tr }) : "—"}</p>
                  </div>
                  {money(student)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
