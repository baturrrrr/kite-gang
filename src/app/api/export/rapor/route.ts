import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = to ? new Date(to) : new Date();
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { direction: "INCOMING", recordedAt: { gte: fromDate, lte: toDate } },
      include: { student: { select: { firstName: true, lastName: true } } },
    }),
    prisma.expense.findMany({
      where: { isActive: true, expenseDate: { gte: fromDate, lte: toDate } },
    }),
  ]);

  const rows: string[] = ["Tür,Tarih,Açıklama,Yöntem,Para Birimi,Tutar"];

  for (const p of payments) {
    const name = p.student ? `${p.student.firstName} ${p.student.lastName}` : "—";
    rows.push(
      `Gelir,${p.recordedAt.toISOString().split("T")[0]},"${name} - ${p.description ?? ""}",${PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS]},${p.currency},${p.amount}`
    );
  }

  for (const e of expenses) {
    rows.push(
      `Gider,${e.expenseDate.toISOString().split("T")[0]},"${e.description}",${PAYMENT_METHODS[e.method as keyof typeof PAYMENT_METHODS]},${e.currency},-${e.amount}`
    );
  }

  const csv = rows.join("\n");
  const BOM = "﻿"; // UTF-8 BOM for Excel compatibility

  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rapor-${fromDate.toISOString().split("T")[0]}-${toDate.toISOString().split("T")[0]}.csv"`,
    },
  });
}
