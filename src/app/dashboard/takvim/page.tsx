import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { LESSON_TYPES } from "@/lib/constants";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08–20

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  BEKLIYOR:   { dot: "bg-warning/40",  label: "Bekliyor" },
  DEVAM:      { dot: "bg-info",   label: "Devam" },
  TAMAMLANDI: { dot: "bg-success",label: "Tamam" },
  IPTAL:      { dot: "bg-destructive/40",    label: "İptal" },
  // Rezervasyon (eski sistem) durumları
  PLANNED:        { dot: "bg-warning/40",  label: "Planlandı" },
  CHECKED_IN:     { dot: "bg-info",   label: "Suda" },
  COMPLETED:      { dot: "bg-success",label: "Tamam" },
  NO_SHOW:        { dot: "bg-destructive/40",    label: "Gelmedi" },
  WIND_CANCELLED: { dot: "bg-muted-foreground/30",   label: "Rüzgar İptali" },
};

type CalendarItem = {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date | null;
  student: { firstName: string; lastName: string } | null;
  instructorId: string | null;
};

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ tarih?: string }>;
}) {
  await requireAdminOrReception();
  const params = await searchParams;

  const selectedDate = params.tarih ? new Date(params.tarih + "T00:00:00") : new Date();
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const prevDate = format(subDays(selectedDate, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const selectedStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = selectedStr === todayStr;

  const [instructors, hizmetler, reservations] = await Promise.all([
    prisma.instructor.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.hizmet.findMany({
      where: {
        isActive: true,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { not: "IPTAL" },
      },
      include: { student: { select: { firstName: true, lastName: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.reservation.findMany({
      where: {
        isActive: true,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: "CANCELLED" },
      },
      include: { student: { select: { firstName: true, lastName: true } } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Hizmet (yeni sistem) ve Reservation (eski rezervasyon sistemi) tek listede birleştirilir
  const items: CalendarItem[] = [
    ...hizmetler.map((h) => ({
      id: `h-${h.id}`,
      title: h.title,
      status: h.status,
      scheduledAt: h.scheduledAt,
      student: h.student,
      instructorId: h.instructorId,
    })),
    ...reservations.map((r) => ({
      id: `r-${r.id}`,
      title: LESSON_TYPES[r.lessonType as keyof typeof LESSON_TYPES] ?? r.lessonType,
      status: r.status,
      scheduledAt: r.startTime as Date | null,
      student: r.student,
      instructorId: r.instructorId,
    })),
  ];

  // Build schedule grid: schedule[instructorId][hour] = items[]
  const schedule: Record<string, Record<number, CalendarItem[]>> = {};
  const unassigned: CalendarItem[] = [];

  for (const it of items) {
    if (!it.scheduledAt || !it.instructorId) { unassigned.push(it); continue; }
    const hour = new Date(it.scheduledAt).getHours();
    if (!schedule[it.instructorId]) schedule[it.instructorId] = {};
    if (!schedule[it.instructorId][hour]) schedule[it.instructorId][hour] = [];
    schedule[it.instructorId][hour].push(it);
  }

  const currentHour = new Date().getHours();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl leading-[0.95] font-extrabold lg:text-4xl">Takvim</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length > 0 ? `${items.length} seans planlanmış` : "Bu gün için seans yok"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <Link href={`/dashboard/takvim?tarih=${todayStr}`}>
              <Button variant="outline" size="sm">Bugün</Button>
            </Link>
          )}
          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <Link
              href={`/dashboard/takvim?tarih=${prevDate}`}
              className="flex items-center justify-center w-9 h-9 text-muted-foreground/70 hover:text-foreground/85 hover:bg-muted/40 border-r border-border transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="px-4 py-2 min-w-[180px] text-center">
              <p className="text-sm font-semibold text-foreground">
                {format(selectedDate, "d MMMM yyyy", { locale: tr })}
              </p>
              <p className="text-[11px] text-muted-foreground/70 capitalize">
                {format(selectedDate, "EEEE", { locale: tr })}
                {isToday && <span className="ml-1 text-info font-semibold">· Bugün</span>}
              </p>
            </div>
            <Link
              href={`/dashboard/takvim?tarih=${nextDate}`}
              className="flex items-center justify-center w-9 h-9 text-muted-foreground/70 hover:text-foreground/85 hover:bg-muted/40 border-l border-border transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {/* Instructor header */}
                <th className="sticky left-0 z-20 bg-muted/40 w-[150px] min-w-[150px] border-r border-border">
                  <div className="px-4 py-3 text-left">
                    <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Eğitmen</span>
                  </div>
                </th>
                {/* Hour headers */}
                {HOURS.map((h) => {
                  const isCurrent = isToday && currentHour === h;
                  return (
                    <th
                      key={h}
                      className={`min-w-[90px] border-r border-border last:border-r-0 ${isCurrent ? "bg-info/10" : ""}`}
                    >
                      <div className="px-2 py-3 text-center">
                        <span className={`text-[11px] font-semibold ${isCurrent ? "text-info" : "text-muted-foreground/70"}`}>
                          {h.toString().padStart(2, "0")}:00
                        </span>
                        {isCurrent && (
                          <div className="w-1.5 h-1.5 rounded-full bg-info mx-auto mt-0.5" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {instructors.map((inst) => (
                <tr key={inst.id} className="hover:bg-muted/40 transition-colors">
                  {/* Instructor cell */}
                  <td className="sticky left-0 z-10 bg-card border-r border-border hover:bg-muted/40">
                    <div className="px-4 py-3 flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: inst.color }}
                      >
                        {inst.user.name.charAt(0)}
                      </div>
                      <p className="text-[13px] font-semibold text-foreground/85 truncate">
                        {inst.user.name.split(" ")[0]}
                      </p>
                    </div>
                  </td>

                  {/* Hour cells */}
                  {HOURS.map((h) => {
                    const isCurrent = isToday && currentHour === h;
                    const cellItems = schedule[inst.id]?.[h] ?? [];

                    return (
                      <td
                        key={h}
                        className={`
                          border-r border-border last:border-r-0 p-1.5 align-top min-h-[68px] min-w-[90px]
                          ${isCurrent ? "bg-info/50" : ""}
                        `}
                      >
                        {cellItems.map((hz) => {
                          const cfg = STATUS_CONFIG[hz.status] ?? { dot: "bg-muted-foreground/30", label: hz.status };
                          return (
                            <div
                              key={hz.id}
                              className="rounded-md px-2 py-1.5 mb-1 border-l-[3px]"
                              style={{
                                borderLeftColor: inst.color,
                                backgroundColor: inst.color + "18",
                              }}
                            >
                              <p
                                className="text-[11px] font-semibold truncate"
                                style={{ color: inst.color }}
                              >
                                {hz.title}
                              </p>
                              {hz.student && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {hz.student.firstName} {hz.student.lastName}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                <span className="text-[10px] text-muted-foreground/70">
                                  {hz.scheduledAt ? format(new Date(hz.scheduledAt), "HH:mm") : cfg.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {instructors.length === 0 && (
                <tr>
                  <td colSpan={HOURS.length + 1} className="text-center py-16">
                    <CalendarDays className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/70 font-medium">Kayıtlı eğitmen bulunamadı</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
            Eğitmensiz / Saatsiz Seanslar
          </p>
          <div className="space-y-2">
            {unassigned.map((hz) => {
              const cfg = STATUS_CONFIG[hz.status] ?? { dot: "bg-muted-foreground/30", label: hz.status };
              return (
                <div key={hz.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[11px] font-mono text-muted-foreground/70 w-10 text-center">
                    {hz.scheduledAt ? format(new Date(hz.scheduledAt), "HH:mm") : "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{hz.title}</p>
                    {hz.student && (
                      <p className="text-xs text-muted-foreground">
                        {hz.student.firstName} {hz.student.lastName}
                      </p>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-muted-foreground/70">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && instructors.length > 0 && (
        <div className="bg-card rounded-xl border border-border text-center py-14">
          <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Bu gün için planlanmış seans yok</p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Müşteri profilinden hizmet ekleyip tarih ve saat belirleyin
          </p>
        </div>
      )}
    </div>
  );
}
