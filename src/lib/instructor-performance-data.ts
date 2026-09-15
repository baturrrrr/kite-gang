import "server-only";
import { endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { LESSON_TYPES } from "@/lib/constants";
import type { Rates } from "@/lib/currency";
import { summarizeBalance, summarizeSessions, type SessionInput } from "@/lib/instructor-performance";

// Eğitmen portalı (Performansım) ve admin eğitmen sayfası hakediş rakamlarını buradan alır;
// iki ekran ayrı ayrı hesaplarsa aynı eğitmen için farklı bakiye gösterirler.

export async function getInstructorMonth(instructorId: string, monthStart: Date, rates: Rates | null) {
  const monthEnd = endOfMonth(monthStart);

  const [lessons, hizmetler] = await Promise.all([
    prisma.lesson.findMany({
      where: { instructorId, checkOutTime: { not: null }, checkInTime: { gte: monthStart, lte: monthEnd } },
      include: {
        student: { select: { firstName: true, lastName: true } },
        reservation: { select: { lessonType: true } },
        instructorEarning: { select: { amount: true, currency: true } },
      },
    }),
    prisma.hizmet.findMany({
      where: {
        instructorId,
        isActive: true,
        status: "TAMAMLANDI",
        OR: [
          { scheduledAt: { gte: monthStart, lte: monthEnd } },
          { scheduledAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
        ],
      },
      include: { student: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const sessions: SessionInput[] = [
    ...lessons.map((l) => ({
      id: l.id,
      kind: "DERS" as const,
      date: l.checkInTime,
      studentId: l.studentId,
      studentName: `${l.student.firstName} ${l.student.lastName}`,
      title: LESSON_TYPES[l.reservation.lessonType as keyof typeof LESSON_TYPES] ?? l.reservation.lessonType,
      hours: l.actualHours,
      earning: l.instructorEarning,
    })),
    ...hizmetler.map((h) => ({
      id: h.id,
      kind: "HIZMET" as const,
      date: h.scheduledAt ?? h.createdAt,
      studentId: h.studentId,
      studentName: h.student ? `${h.student.firstName} ${h.student.lastName}` : null,
      title: h.title,
      hours: h.durationHours,
      earning: h.instructorEarning ? { amount: h.instructorEarning, currency: h.currency } : null,
    })),
  ];

  return summarizeSessions(sessions, rates);
}

// Tüm zamanlar: tamamlanan ders + hizmet hakedişleri ve yapılan tüm hakediş ödemeleri
export async function getInstructorBalance(instructorId: string, rates: Rates | null) {
  const [lessonEarnings, hizmetEarnings, payouts] = await Promise.all([
    prisma.instructorEarning.findMany({ where: { instructorId }, select: { amount: true, currency: true } }),
    prisma.hizmet.findMany({
      where: { instructorId, isActive: true, status: "TAMAMLANDI", instructorEarning: { not: null } },
      select: { instructorEarning: true, currency: true },
    }),
    prisma.instructorPayout.findMany({ where: { instructorId }, select: { amount: true, currency: true } }),
  ]);

  return summarizeBalance(
    [
      ...lessonEarnings,
      ...hizmetEarnings.map((h) => ({ amount: h.instructorEarning ?? 0, currency: h.currency })),
    ],
    payouts,
    rates
  );
}
