import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08–20

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  BEKLIYOR:   { dot: "bg-amber-400",  label: "Bekliyor" },
  DEVAM:      { dot: "bg-blue-500",   label: "Devam" },
  TAMAMLANDI: { dot: "bg-emerald-500",label: "Tamam" },
  IPTAL:      { dot: "bg-red-400",    label: "İptal" },
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

  const [instructors, hizmetler] = await Promise.all([
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
  ]);

  // Build schedule grid: schedule[instructorId][hour] = hizmetler[]
  const schedule: Record<string, Record<number, typeof hizmetler>> = {};
  const unassigned: typeof hizmetler = [];

  for (const h of hizmetler) {
    if (!h.scheduledAt) { unassigned.push(h); continue; }
    const hour = new Date(h.scheduledAt).getHours();
    if (!h.instructorId) { unassigned.push(h); continue; }
    if (!schedule[h.instructorId]) schedule[h.instructorId] = {};
    if (!schedule[h.instructorId][hour]) schedule[h.instructorId][hour] = [];
    schedule[h.instructorId][hour].push(h);
  }

  const currentHour = new Date().getHours();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Takvim</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {hizmetler.length > 0 ? `${hizmetler.length} seans planlanmış` : "Bu gün için seans yok"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <Link href={`/dashboard/takvim?tarih=${todayStr}`}>
              <Button variant="outline" size="sm">Bugün</Button>
            </Link>
          )}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <Link
              href={`/dashboard/takvim?tarih=${prevDate}`}
              className="flex items-center justify-center w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-r border-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="px-4 py-2 min-w-[180px] text-center">
              <p className="text-sm font-semibold text-slate-800">
                {format(selectedDate, "d MMMM yyyy", { locale: tr })}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">
                {format(selectedDate, "EEEE", { locale: tr })}
                {isToday && <span className="ml-1 text-blue-600 font-semibold">· Bugün</span>}
              </p>
            </div>
            <Link
              href={`/dashboard/takvim?tarih=${nextDate}`}
              className="flex items-center justify-center w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-l border-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Instructor header */}
                <th className="sticky left-0 z-20 bg-slate-50 w-[150px] min-w-[150px] border-r border-slate-200">
                  <div className="px-4 py-3 text-left">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Eğitmen</span>
                  </div>
                </th>
                {/* Hour headers */}
                {HOURS.map((h) => {
                  const isCurrent = isToday && currentHour === h;
                  return (
                    <th
                      key={h}
                      className={`min-w-[90px] border-r border-slate-100 last:border-r-0 ${isCurrent ? "bg-blue-50" : ""}`}
                    >
                      <div className="px-2 py-3 text-center">
                        <span className={`text-[11px] font-semibold ${isCurrent ? "text-blue-600" : "text-slate-400"}`}>
                          {h.toString().padStart(2, "0")}:00
                        </span>
                        {isCurrent && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {instructors.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Instructor cell */}
                  <td className="sticky left-0 z-10 bg-white border-r border-slate-200 hover:bg-slate-50/50">
                    <div className="px-4 py-3 flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: inst.color }}
                      >
                        {inst.user.name.charAt(0)}
                      </div>
                      <p className="text-[13px] font-semibold text-slate-700 truncate">
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
                          border-r border-slate-100 last:border-r-0 p-1.5 align-top min-h-[68px] min-w-[90px]
                          ${isCurrent ? "bg-blue-50/50" : ""}
                        `}
                      >
                        {cellItems.map((hz) => {
                          const cfg = STATUS_CONFIG[hz.status] ?? { dot: "bg-gray-300", label: hz.status };
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
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {hz.student.firstName} {hz.student.lastName}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                <span className="text-[10px] text-slate-400">
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
                    <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">Kayıtlı eğitmen bulunamadı</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Eğitmensiz / Saatsiz Seanslar
          </p>
          <div className="space-y-2">
            {unassigned.map((hz) => {
              const cfg = STATUS_CONFIG[hz.status] ?? { dot: "bg-gray-300", label: hz.status };
              return (
                <div key={hz.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
                    {hz.scheduledAt ? format(new Date(hz.scheduledAt), "HH:mm") : "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{hz.title}</p>
                    {hz.student && (
                      <p className="text-xs text-slate-500">
                        {hz.student.firstName} {hz.student.lastName}
                      </p>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-slate-400">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {hizmetler.length === 0 && instructors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-14">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Bu gün için planlanmış seans yok</p>
          <p className="text-xs text-slate-400 mt-1.5">
            Müşteri profilinden hizmet ekleyip tarih ve saat belirleyin
          </p>
        </div>
      )}
    </div>
  );
}
