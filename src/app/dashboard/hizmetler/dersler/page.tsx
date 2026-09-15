import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardCheck, Search } from "lucide-react";
import { LESSON_TYPES } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DerslerFilters } from "./dersler-filters";

const AVATAR_COLORS = [
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-info/15 text-info",
  "bg-info/15 text-info",
  "bg-destructive/15 text-destructive",
];

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function DerslerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  await requireAdminOrReception();
  const params = await searchParams;
  const q = params.q ?? "";
  const durum = params.durum ?? "tumu";

  const lessons = await prisma.lesson.findMany({
    where: {
      reservation: { lessonType: { not: "EQUIPMENT_RENTAL" } },
      ...(durum === "devam" ? { checkOutTime: null } : {}),
      ...(durum === "tamamlandi" ? { checkOutTime: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { student: { firstName: { contains: q } } },
              { student: { lastName: { contains: q } } },
              { instructor: { user: { name: { contains: q } } } },
            ],
          }
        : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      instructor: { include: { user: { select: { name: true } } } },
      reservation: { select: { lessonType: true } },
    },
    orderBy: { checkInTime: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href="/dashboard/operasyon">
          <Button size="sm">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Check-in Yap
          </Button>
        </Link>
      </div>

      <DerslerFilters q={q} durum={durum} />

      <div className="bg-card rounded-xl border overflow-hidden">
        {lessons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/70">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Öğrenci</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Eğitmen</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ders Türü</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Süre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lessons.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {initialsOf(l.student.firstName, l.student.lastName)}
                        </div>
                        <p className="font-medium text-foreground">{l.student.firstName} {l.student.lastName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.instructor?.user.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {LESSON_TYPES[l.reservation.lessonType as keyof typeof LESSON_TYPES] ?? l.reservation.lessonType}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(l.checkInTime), "d MMM yyyy HH:mm", { locale: tr })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.actualHours != null ? `${l.actualHours.toFixed(1)} saat` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {l.checkOutTime ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-success/10 text-success">
                          <CheckCircle2 className="w-3 h-3" /> Tamamlandı
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning">
                          Devam Ediyor
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lessons.length > 0 && (
          <div className="flex items-center justify-end px-4 py-2.5 border-t text-xs text-muted-foreground/70">
            1–{lessons.length} / {lessons.length} kayıt
          </div>
        )}
      </div>
    </div>
  );
}
