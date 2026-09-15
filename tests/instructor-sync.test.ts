/**
 * Eğitmen portalı ↔ admin senkronu: eğitmenin check-in/out'u, adminin hizmet ataması ve
 * hakediş ödemesi, iki ekranın kullandığı ortak hesaplara (instructor-performance-data) yansımalı.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";
import { createTestDb, closeTestDb } from "./helpers/db";
import Database from "better-sqlite3";

const ADMIN = { userId: "user-admin", role: "ADMIN", name: "Admin", email: "admin@test.com", instructorId: null };
const INSTRUCTOR = { userId: "user-ahmet", role: "INSTRUCTOR", name: "Ahmet", email: "ahmet@test.com", instructorId: "instr-ahmet" };
const RATES = { TRY: 1 as const, USD: 40, EUR: 50, updatedAt: "2026-09-15T10:00:00.000Z", source: "live" as const };

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  requireAdminOrReception: vi.fn(),
}));

vi.mock("@/lib/exchange-rates", () => ({
  getExchangeRates: vi.fn(async () => RATES),
}));

let testPrisma: PrismaClient;
let rawDb: Database.Database;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

async function actAs(user: typeof ADMIN | typeof INSTRUCTOR) {
  const auth = await import("@/lib/auth");
  vi.mocked(auth.requireAuth).mockResolvedValue(user);
  vi.mocked(auth.requireAdmin).mockResolvedValue(user);
  vi.mocked(auth.requireAdminOrReception).mockResolvedValue(user);
}

const MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

beforeAll(() => {
  const { db, prisma } = createTestDb();
  rawDb = db;
  testPrisma = prisma;
});

afterAll(() => {
  closeTestDb(rawDb);
});

beforeEach(async () => {
  for (const table of [
    "cashRegisterEntry", "payment", "instructorPayout", "instructorEarning", "lesson", "reservation",
    "hizmet", "packagePurchase", "lessonPackage", "cashAccount", "student", "instructor", "user",
  ] as const) {
    // @ts-expect-error — delegeler dinamik olarak seçiliyor
    await testPrisma[table].deleteMany();
  }

  await testPrisma.user.createMany({
    data: [
      { id: ADMIN.userId, name: "Admin", email: ADMIN.email, password: "x", role: "ADMIN" },
      { id: INSTRUCTOR.userId, name: "Ahmet", email: INSTRUCTOR.email, password: "x", role: "INSTRUCTOR" },
      { id: "user-fatma", name: "Fatma", email: "fatma@test.com", password: "x", role: "INSTRUCTOR" },
    ],
  });
  await testPrisma.instructor.createMany({
    data: [
      { id: INSTRUCTOR.instructorId, userId: INSTRUCTOR.userId, paymentModel: "HOURLY_RATE", hourlyRate: 30, hourlyRateCurrency: "EUR" },
      { id: "instr-fatma", userId: "user-fatma", paymentModel: "HOURLY_RATE", hourlyRate: 30, hourlyRateCurrency: "EUR" },
    ],
  });
  await testPrisma.student.create({ data: { id: "student-1", firstName: "Ali", lastName: "Yılmaz" } });
  await testPrisma.lessonPackage.create({
    data: { id: "pkg-1", name: "Paket", lessonType: "PRIVATE", totalHours: 10, price: 500, currency: "EUR" },
  });
  await testPrisma.packagePurchase.create({
    data: { id: "purchase-1", studentId: "student-1", packageId: "pkg-1", totalHours: 10, remainingHours: 10, purchasePrice: 500, currency: "EUR" },
  });
  await testPrisma.reservation.create({
    data: {
      id: "res-1",
      studentId: "student-1",
      instructorId: INSTRUCTOR.instructorId,
      lessonType: "PRIVATE",
      startTime: new Date(),
      endTime: new Date(),
      plannedHours: 2,
      status: "PLANNED",
    },
  });
  await testPrisma.cashAccount.create({
    data: { id: "kasa-try", name: "Nakit Kasa TRY", accountType: "CASH", currency: "TRY", balance: 100000 },
  });
});

async function instructorLessonDone() {
  await actAs(INSTRUCTOR);
  const { checkIn, checkOut } = await import("@/app/actions/reservations");

  const inForm = new FormData();
  inForm.set("reservationId", "res-1");
  inForm.set("purchaseId", "purchase-1");
  expect((await checkIn({}, inForm)).error).toBeUndefined();

  const lesson = await testPrisma.lesson.findFirstOrThrow({ where: { reservationId: "res-1" } });
  const outForm = new FormData();
  outForm.set("lessonId", lesson.id);
  outForm.set("actualHours", "2");
  expect((await checkOut({}, outForm)).error).toBeUndefined();
}

describe("eğitmen portalı ↔ admin senkronu", () => {
  it("eğitmenin check-out'u hem ay özetine hem bakiyeye yansır", async () => {
    await instructorLessonDone();
    const { getInstructorMonth, getInstructorBalance } = await import("@/lib/instructor-performance-data");

    const month = await getInstructorMonth(INSTRUCTOR.instructorId, MONTH, RATES);
    const balance = await getInstructorBalance(INSTRUCTOR.instructorId, RATES);

    expect(month.sessionCount).toBe(1);
    expect(month.totalHours).toBe(2);
    expect(month.studentCount).toBe(1);
    expect(month.earnedTRY).toBe(2 * 30 * 50); // 2 saat × 30 EUR × 50 TL
    expect(balance).toEqual({ earnedTRY: 3000, paidTRY: 0, pendingTRY: 3000 });

    // Admin tarafında aynı ders ve paket saati görünür
    const purchase = await testPrisma.packagePurchase.findUniqueOrThrow({ where: { id: "purchase-1" } });
    expect(purchase.remainingHours).toBe(8);
  });

  it("adminin atadığı tamamlanmış hizmet eğitmen portalına eklenir", async () => {
    await instructorLessonDone();

    await actAs(ADMIN);
    const { assignHizmet } = await import("@/app/actions/hizmetler");
    const form = new FormData();
    form.set("studentId", "student-1");
    form.set("sablonId", "sablon-ozel-ders");
    form.set("category", "EGITIM");
    form.set("title", "Özel Ders");
    form.set("instructorId", INSTRUCTOR.instructorId);
    form.set("amount", "4000");
    form.set("currency", "TRY");
    form.set("instructorEarning", "1000");
    form.set("scheduledAt", new Date().toISOString());
    form.set("status", "TAMAMLANDI");
    expect((await assignHizmet({}, form)).error).toBeUndefined();

    const { getInstructorMonth, getInstructorBalance } = await import("@/lib/instructor-performance-data");
    const month = await getInstructorMonth(INSTRUCTOR.instructorId, MONTH, RATES);
    const balance = await getInstructorBalance(INSTRUCTOR.instructorId, RATES);

    expect(month.sessionCount).toBe(2);
    expect(month.earnedTRY).toBe(3000 + 1000);
    expect(balance.pendingTRY).toBe(4000);
  });

  it("adminin hakediş ödemesi eğitmenin bekleyen bakiyesini düşürür ve kasadan çıkar", async () => {
    await instructorLessonDone();

    await actAs(ADMIN);
    const { recordInstructorPayout } = await import("@/app/actions/instructors");
    const form = new FormData();
    form.set("instructorId", INSTRUCTOR.instructorId);
    form.set("amount", "60");
    form.set("currency", "EUR");
    form.set("method", "CASH");
    form.set("cashAccountId", "kasa-try");
    expect((await recordInstructorPayout({}, form)).error).toBeUndefined();

    const { getInstructorBalance } = await import("@/lib/instructor-performance-data");
    const balance = await getInstructorBalance(INSTRUCTOR.instructorId, RATES);
    expect(balance).toEqual({ earnedTRY: 3000, paidTRY: 3000, pendingTRY: 0 });

    const earning = await testPrisma.instructorEarning.findFirstOrThrow({ where: { instructorId: INSTRUCTOR.instructorId } });
    expect(earning.isPaid).toBe(true);
    const kasa = await testPrisma.cashAccount.findUniqueOrThrow({ where: { id: "kasa-try" } });
    expect(kasa.balance).toBe(100000 - 3000);
  });

  it("bir eğitmenin verisi diğer eğitmenin portalına karışmaz", async () => {
    await instructorLessonDone();
    const { getInstructorMonth, getInstructorBalance } = await import("@/lib/instructor-performance-data");

    const month = await getInstructorMonth("instr-fatma", MONTH, RATES);
    const balance = await getInstructorBalance("instr-fatma", RATES);

    expect(month.sessionCount).toBe(0);
    expect(balance.earnedTRY).toBe(0);
  });

  it("eğitmen başka eğitmenin rezervasyonuna check-in yapamaz", async () => {
    await testPrisma.reservation.update({ where: { id: "res-1" }, data: { instructorId: "instr-fatma" } });
    await actAs(INSTRUCTOR);
    const { checkIn } = await import("@/app/actions/reservations");

    const form = new FormData();
    form.set("reservationId", "res-1");
    expect((await checkIn({}, form)).error).toBe("Bu rezervasyon size ait değil");
  });
});
