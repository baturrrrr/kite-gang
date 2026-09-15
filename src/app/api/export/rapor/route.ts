import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { convertAmount } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

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
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type") ?? "all";

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = to ? new Date(to) : new Date();
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  if (type === "income") {
    const payments = await prisma.payment.findMany({
      where: { direction: "INCOMING", recordedAt: { gte: fromDate, lte: toDate } },
      include: { student: { select: { firstName: true, lastName: true } } },
      orderBy: { recordedAt: "desc" },
    });
    const rows = payments.map((p) => [
      p.recordedAt.toISOString().split("T")[0],
      p.student ? `${p.student.firstName} ${p.student.lastName}` : "—",
      p.description ?? "",
      PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method,
      p.currency,
      p.amount,
    ]);
    return toCsvResponse(
      ["Tarih", "Müşteri", "Açıklama", "Yöntem", "Para Birimi", "Tutar"],
      rows,
      `gelirler-${fromStr}-${toStr}`
    );
  }

  if (type === "expense") {
    const expenses = await prisma.expense.findMany({
      where: { isActive: true, expenseDate: { gte: fromDate, lte: toDate } },
      orderBy: { expenseDate: "desc" },
    });
    const rows = expenses.map((e) => [
      e.expenseDate.toISOString().split("T")[0],
      EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category,
      e.description,
      PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS] ?? e.method,
      e.currency,
      e.amount,
    ]);
    return toCsvResponse(
      ["Tarih", "Kategori", "Açıklama", "Yöntem", "Para Birimi", "Tutar"],
      rows,
      `giderler-${fromStr}-${toStr}`
    );
  }

  if (type === "instructors") {
    const [earnings, payouts] = await Promise.all([
      prisma.instructorEarning.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { instructor: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.instructorPayout.findMany({
        where: { paidAt: { gte: fromDate, lte: toDate } },
        include: { instructor: { include: { user: { select: { name: true } } } } },
        orderBy: { paidAt: "desc" },
      }),
    ]);
    const rows: (string | number)[][] = [
      ...earnings.map((e) => [
        e.instructor.user.name,
        "Hakediş",
        e.createdAt.toISOString().split("T")[0],
        e.hours,
        e.currency,
        e.amount,
        e.isPaid ? "Ödendi" : "Bekliyor",
      ]),
      ...payouts.map((p) => [
        p.instructor.user.name,
        "Ödeme",
        p.paidAt.toISOString().split("T")[0],
        "",
        p.currency,
        p.amount,
        p.notes ?? "",
      ]),
    ];
    return toCsvResponse(
      ["Eğitmen", "Tür", "Tarih", "Saat", "Para Birimi", "Tutar", "Not/Durum"],
      rows,
      `egitmenler-${fromStr}-${toStr}`
    );
  }

  if (type === "receivables") {
    const [packagePurchases, rates] = await Promise.all([
      prisma.packagePurchase.findMany({
        where: { isActive: true },
        include: { payments: true, student: { select: { firstName: true, lastName: true } }, package: { select: { name: true } } },
        orderBy: { purchasedAt: "desc" },
      }),
      getExchangeRates(),
    ]);
    const rows = packagePurchases
      .map((pp) => {
        // Ödemeler paketten farklı para biriminde alınmış olabilir.
        const paid = pp.payments.reduce((sum, p) => sum + convertAmount(p.amount, p.currency, pp.currency, rates), 0);
        const owed = pp.purchasePrice - paid;
        return { pp, owed };
      })
      .filter(({ owed }) => owed > 0.01)
      .map(({ pp, owed }) => [
        `${pp.student.firstName} ${pp.student.lastName}`,
        pp.package.name,
        pp.purchasedAt.toISOString().split("T")[0],
        pp.currency,
        owed,
      ]);
    return toCsvResponse(
      ["Müşteri", "Paket", "Satın Alma Tarihi", "Para Birimi", "Kalan Borç"],
      rows,
      `bekleyen-alacaklar-${fromStr}-${toStr}`
    );
  }

  if (type === "lessons") {
    const lessons = await prisma.lesson.findMany({
      where: { checkInTime: { gte: fromDate, lte: toDate }, checkOutTime: { not: null } },
      include: {
        instructor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { checkInTime: "desc" },
    });
    const byInstructor: Record<string, { name: string; count: number; hours: number; students: Set<string> }> = {};
    for (const l of lessons) {
      if (!l.instructor || !l.instructorId) continue;
      const name = l.instructor.user.name;
      if (!byInstructor[l.instructorId]) {
        byInstructor[l.instructorId] = { name, count: 0, hours: 0, students: new Set() };
      }
      byInstructor[l.instructorId].count++;
      byInstructor[l.instructorId].hours += l.actualHours ?? 0;
      byInstructor[l.instructorId].students.add(l.studentId);
    }
    const rows = Object.values(byInstructor).map((e) => [e.name, e.count, e.hours.toFixed(1), e.students.size]);
    return toCsvResponse(
      ["Eğitmen", "Ders Sayısı", "Toplam Saat", "Öğrenci Sayısı"],
      rows,
      `ders-istatistikleri-${fromStr}-${toStr}`
    );
  }

  // type === "all" (varsayılan): Gelir + Gider birlikte
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { direction: "INCOMING", recordedAt: { gte: fromDate, lte: toDate } },
      include: { student: { select: { firstName: true, lastName: true } } },
    }),
    prisma.expense.findMany({
      where: { isActive: true, expenseDate: { gte: fromDate, lte: toDate } },
    }),
  ]);

  const rows: (string | number)[][] = [
    ...payments.map((p) => {
      const name = p.student ? `${p.student.firstName} ${p.student.lastName}` : "—";
      return [
        "Gelir",
        p.recordedAt.toISOString().split("T")[0],
        `${name} - ${p.description ?? ""}`,
        PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method,
        p.currency,
        p.amount,
      ];
    }),
    ...expenses.map((e) => [
      "Gider",
      e.expenseDate.toISOString().split("T")[0],
      e.description,
      PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS] ?? e.method,
      e.currency,
      -e.amount,
    ]),
  ];

  return toCsvResponse(
    ["Tür", "Tarih", "Açıklama", "Yöntem", "Para Birimi", "Tutar"],
    rows,
    `rapor-${fromStr}-${toStr}`
  );
}
