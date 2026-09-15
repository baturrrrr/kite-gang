import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAYMENT_MODELS, LESSON_TYPES } from "@/lib/constants";

function csvCell(value: string | number) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsvResponse(header: string[], rows: (string | number)[][], filename: string) {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  const csv = lines.join("\n");
  const BOM = "﻿"; // UTF-8 BOM for Excel compatibility

  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const url = new URL(req.url);
  const instructorId = url.searchParams.get("instructorId");
  const today = new Date().toISOString().split("T")[0];

  // Tek bir eğitmenin ders, hakediş ve ödeme geçmişi
  if (instructorId && instructorId !== "all") {
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        user: { select: { name: true } },
        lessons: {
          include: {
            student: { select: { firstName: true, lastName: true } },
            reservation: { select: { lessonType: true } },
            instructorEarning: true,
          },
          orderBy: { checkInTime: "desc" },
        },
        hizmetler: {
          where: { isActive: true },
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        },
        payouts: { orderBy: { paidAt: "desc" } },
      },
    });

    if (!instructor) {
      return NextResponse.json({ error: "Eğitmen bulunamadı" }, { status: 404 });
    }

    const rows: (string | number)[][] = [
      ...instructor.lessons.map((l) => [
        l.checkInTime.toISOString().split("T")[0],
        "Ders",
        `${l.student.firstName} ${l.student.lastName}`,
        LESSON_TYPES[l.reservation.lessonType as keyof typeof LESSON_TYPES] ?? l.reservation.lessonType,
        l.actualHours ?? "",
        l.instructorEarning?.currency ?? "",
        l.instructorEarning?.amount ?? "",
        l.instructorEarning ? (l.instructorEarning.isPaid ? "Ödendi" : "Kazanıldı") : "—",
      ]),
      ...instructor.hizmetler.map((h) => [
        (h.scheduledAt ?? h.createdAt).toISOString().split("T")[0],
        "Hizmet",
        h.student ? `${h.student.firstName} ${h.student.lastName}` : "—",
        h.title,
        "",
        h.currency,
        h.status === "TAMAMLANDI" ? h.instructorEarning ?? "" : "",
        h.status === "TAMAMLANDI" ? "Kazanıldı" : h.status === "DEVAM" ? "Devam Ediyor" : "Bekliyor",
      ]),
      ...instructor.payouts.map((p) => [
        p.paidAt.toISOString().split("T")[0],
        "Ödeme",
        "",
        p.notes ?? "",
        "",
        p.currency,
        p.amount,
        "Ödendi",
      ]),
    ];

    const safeName = instructor.user.name.toLowerCase().replace(/[^a-z0-9şçöğüıİ]+/gi, "-");
    return toCsvResponse(
      ["Tarih", "Kaynak", "Müşteri", "Açıklama", "Saat", "Para Birimi", "Tutar", "Durum"],
      rows,
      `egitmen-${safeName}-${today}`
    );
  }

  // Tüm eğitmenlerin özeti
  const instructors = await prisma.instructor.findMany({
    where: { isActive: true },
    include: {
      user: { select: { name: true } },
      _count: { select: { lessons: true } },
      earnings: { select: { amount: true, hours: true, isPaid: true } },
      payouts: { select: { amount: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const rows = instructors.map((i) => {
    const totalHours = i.earnings.reduce((sum, e) => sum + e.hours, 0);
    const totalEarned = i.earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = i.earnings.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    const totalPayouts = i.payouts.reduce((sum, p) => sum + p.amount, 0);
    const pending = totalEarned - totalPaid;
    return [
      i.user.name,
      PAYMENT_MODELS[i.paymentModel as keyof typeof PAYMENT_MODELS] ?? i.paymentModel,
      i.hourlyRate ?? "",
      i.hourlyRateCurrency,
      i._count.lessons,
      totalHours.toFixed(1),
      totalEarned.toFixed(2),
      totalPayouts.toFixed(2),
      pending.toFixed(2),
    ];
  });

  return toCsvResponse(
    ["Eğitmen", "Ödeme Modeli", "Saatlik Ücret", "Para Birimi", "Toplam Ders", "Toplam Saat", "Toplam Hakediş", "Toplam Ödenen", "Bekleyen"],
    rows,
    `egitmenler-ozet-${today}`
  );
}
