/**
 * Critical flow tests: check-out → hour deduction → earning creation → cash update
 *
 * These are integration tests that run against a real SQLite database so the
 * transaction semantics (atomicity, foreign-key constraints) are exercised.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";
import { createTestDb, closeTestDb } from "./helpers/db";
import Database from "better-sqlite3";

// ─── Auth mock ───────────────────────────────────────────────────────────────

const MOCK_USER = { userId: "user-test-1", role: "ADMIN", name: "Test Admin", email: "admin@test.com" };

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(MOCK_USER),
  requireAdmin: vi.fn().mockResolvedValue(MOCK_USER),
  requireAdminOrReception: vi.fn().mockResolvedValue(MOCK_USER),
}));

// ─── Prisma client swap ───────────────────────────────────────────────────────
// We replace the shared singleton with our test client before importing actions.

let testPrisma: PrismaClient;
let rawDb: Database.Database;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

// ─── Test database seed helpers ───────────────────────────────────────────────

async function seedMinimal(prisma: PrismaClient) {
  const user = await prisma.user.create({
    data: {
      id: "user-test-1",
      name: "Test Admin",
      email: "admin@test.com",
      password: "hashed",
      role: "ADMIN",
    },
  });

  const instructor = await prisma.instructor.create({
    data: {
      id: "instr-1",
      userId: user.id,
      paymentModel: "HOURLY_RATE",
      hourlyRate: 30,
      hourlyRateCurrency: "EUR",
    },
  });

  const student = await prisma.student.create({
    data: {
      id: "student-1",
      firstName: "Ali",
      lastName: "Yılmaz",
    },
  });

  const pkg = await prisma.lessonPackage.create({
    data: {
      id: "pkg-1",
      name: "Başlangıç Paketi",
      lessonType: "PRIVATE",
      totalHours: 10,
      price: 500,
      currency: "EUR",
    },
  });

  const purchase = await prisma.packagePurchase.create({
    data: {
      id: "purchase-1",
      studentId: student.id,
      packageId: pkg.id,
      totalHours: 10,
      remainingHours: 10,
      purchasePrice: 500,
      currency: "EUR",
    },
  });

  const reservation = await prisma.reservation.create({
    data: {
      id: "res-1",
      studentId: student.id,
      instructorId: instructor.id,
      lessonType: "PRIVATE",
      startTime: new Date("2026-07-13T10:00:00Z"),
      endTime: new Date("2026-07-13T12:00:00Z"),
      plannedHours: 2,
      status: "CHECKED_IN",
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      id: "lesson-1",
      reservationId: reservation.id,
      studentId: student.id,
      instructorId: instructor.id,
      purchaseId: purchase.id,
      checkInTime: new Date("2026-07-13T10:00:00Z"),
    },
  });

  return { user, instructor, student, pkg, purchase, reservation, lesson };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const { db, prisma } = createTestDb();
  rawDb = db;
  testPrisma = prisma;
});

afterAll(() => {
  closeTestDb(rawDb);
});

beforeEach(async () => {
  // Clear tables in dependency order before each test
  await testPrisma.instructorEarning.deleteMany();
  await testPrisma.lesson.deleteMany();
  await testPrisma.reservation.deleteMany();
  await testPrisma.packagePurchase.deleteMany();
  await testPrisma.lessonPackage.deleteMany();
  await testPrisma.student.deleteMany();
  await testPrisma.instructor.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.cashRegisterEntry.deleteMany();
  await testPrisma.cashAccount.deleteMany();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("checkOut — kritik akış", () => {
  it("ders saatini günceller ve rezervasyonu COMPLETED yapar", async () => {
    const { lesson, reservation } = await seedMinimal(testPrisma);

    const { checkOut } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("lessonId", lesson.id);
    formData.set("actualHours", "1.5");
    formData.set("instructorNotes", "İyi ders");

    const result = await checkOut({}, formData);

    expect(result.error).toBeUndefined();

    const updatedLesson = await testPrisma.lesson.findUnique({ where: { id: lesson.id } });
    expect(updatedLesson?.actualHours).toBe(1.5);
    expect(updatedLesson?.checkOutTime).toBeTruthy();
    expect(updatedLesson?.instructorNotes).toBe("İyi ders");

    const updatedRes = await testPrisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(updatedRes?.status).toBe("COMPLETED");
  });

  it("eğitmen hakediş kaydı oluşturur (saatlik ücret modeli)", async () => {
    const { lesson, instructor } = await seedMinimal(testPrisma);

    const { checkOut } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("lessonId", lesson.id);
    formData.set("actualHours", "2");

    await checkOut({}, formData);

    const earning = await testPrisma.instructorEarning.findFirst({
      where: { instructorId: instructor.id },
    });

    expect(earning).toBeTruthy();
    expect(earning?.hours).toBe(2);
    expect(earning?.amount).toBe(60); // 2h × 30 EUR/h
    expect(earning?.currency).toBe("EUR");
    expect(earning?.isPaid).toBe(false);
    expect(earning?.lessonId).toBe(lesson.id);
  });

  it("paket saatini düşürür (remainingHours azalır)", async () => {
    const { lesson, purchase } = await seedMinimal(testPrisma);

    const { checkOut } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("lessonId", lesson.id);
    formData.set("actualHours", "2");

    await checkOut({}, formData);

    const updatedPurchase = await testPrisma.packagePurchase.findUnique({
      where: { id: purchase.id },
    });

    expect(updatedPurchase?.remainingHours).toBe(8); // 10 - 2 = 8
  });

  it("tüm değişiklikler atomik — hata olursa hiçbiri kaydedilmez", async () => {
    const { lesson } = await seedMinimal(testPrisma);

    // First checkout should succeed
    const { checkOut } = await import("@/app/actions/reservations");
    const formData1 = new FormData();
    formData1.set("lessonId", lesson.id);
    formData1.set("actualHours", "2");
    await checkOut({}, formData1);

    // Second checkout on same lesson should fail (already has checkOutTime)
    const formData2 = new FormData();
    formData2.set("lessonId", lesson.id);
    formData2.set("actualHours", "1");
    const result2 = await checkOut({}, formData2);

    expect(result2.error).toBe("Bu ders zaten tamamlandı");

    // Earning count must be exactly 1 (no duplicate)
    const earnings = await testPrisma.instructorEarning.findMany({
      where: { lessonId: lesson.id },
    });
    expect(earnings).toHaveLength(1);
  });

  it("geçersiz saat girildiğinde hata döner", async () => {
    const { lesson } = await seedMinimal(testPrisma);

    const { checkOut } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("lessonId", lesson.id);
    formData.set("actualHours", "0");

    const result = await checkOut({}, formData);
    expect(result.error).toBe("Geçerli ders süresi girin");
  });

  it("var olmayan ders id ile hata döner", async () => {
    await seedMinimal(testPrisma);

    const { checkOut } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("lessonId", "non-existent-id");
    formData.set("actualHours", "1");

    const result = await checkOut({}, formData);
    expect(result.error).toBe("Ders bulunamadı");
  });
});

describe("checkOut — gelir paylaşımı modeli", () => {
  it("revenue share ile hakediş orantılı hesaplanır", async () => {
    // Setup: instructor with REVENUE_SHARE model
    const user = await testPrisma.user.create({
      data: { id: "user-test-1", name: "Admin", email: "admin@test.com", password: "x", role: "ADMIN" },
    });
    const instructor = await testPrisma.instructor.create({
      data: {
        id: "instr-1",
        userId: user.id,
        paymentModel: "REVENUE_SHARE",
        revenueShare: 20, // 20%
      },
    });
    const student = await testPrisma.student.create({
      data: { id: "student-1", firstName: "Ayşe", lastName: "Kara" },
    });
    const pkg = await testPrisma.lessonPackage.create({
      data: { id: "pkg-1", name: "Paket", lessonType: "PRIVATE", totalHours: 10, price: 500, currency: "EUR" },
    });
    const purchase = await testPrisma.packagePurchase.create({
      data: {
        id: "purchase-1",
        studentId: student.id,
        packageId: pkg.id,
        totalHours: 10,
        remainingHours: 10,
        purchasePrice: 500, // 50 EUR/h
        currency: "EUR",
      },
    });
    const reservation = await testPrisma.reservation.create({
      data: {
        id: "res-1",
        studentId: student.id,
        instructorId: instructor.id,
        lessonType: "PRIVATE",
        startTime: new Date(),
        endTime: new Date(),
        plannedHours: 2,
        status: "CHECKED_IN",
      },
    });
    const lesson = await testPrisma.lesson.create({
      data: {
        id: "lesson-1",
        reservationId: reservation.id,
        studentId: student.id,
        instructorId: instructor.id,
        purchaseId: purchase.id,
        checkInTime: new Date(),
      },
    });

    const { checkOut } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("lessonId", lesson.id);
    formData.set("actualHours", "2");

    await checkOut({}, formData);

    const earning = await testPrisma.instructorEarning.findFirst({
      where: { instructorId: instructor.id },
    });

    // hourly_rate = 500/10 = 50 EUR/h
    // earning = 2h × 50 EUR/h × 20% = 20 EUR
    expect(earning?.amount).toBe(20);
    expect(earning?.currency).toBe("EUR");
  });
});

describe("checkIn", () => {
  it("rezervasyonu CHECKED_IN yapar ve ders kaydı oluşturur", async () => {
    // Create a PLANNED reservation
    const user = await testPrisma.user.create({
      data: { id: "user-test-1", name: "Admin", email: "admin@test.com", password: "x", role: "ADMIN" },
    });
    const instructor = await testPrisma.instructor.create({
      data: { id: "instr-1", userId: user.id },
    });
    const student = await testPrisma.student.create({
      data: { id: "student-1", firstName: "Test", lastName: "Student" },
    });
    const reservation = await testPrisma.reservation.create({
      data: {
        id: "res-1",
        studentId: student.id,
        instructorId: instructor.id,
        lessonType: "PRIVATE",
        startTime: new Date(),
        endTime: new Date(),
        plannedHours: 2,
        status: "PLANNED",
      },
    });

    const { checkIn } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("reservationId", reservation.id);
    formData.set("kiteSize", "12m");
    formData.set("boardType", "TT");

    const result = await checkIn({}, formData);
    expect(result.error).toBeUndefined();

    const updatedRes = await testPrisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(updatedRes?.status).toBe("CHECKED_IN");

    const lesson = await testPrisma.lesson.findFirst({ where: { reservationId: reservation.id } });
    expect(lesson).toBeTruthy();
    expect(lesson?.kiteSize).toBe("12m");
    expect(lesson?.checkOutTime).toBeNull();
  });

  it("PLANNED olmayan rezervasyon için check-in reddedilir", async () => {
    const user = await testPrisma.user.create({
      data: { id: "user-test-1", name: "Admin", email: "admin@test.com", password: "x", role: "ADMIN" },
    });
    const instructor = await testPrisma.instructor.create({
      data: { id: "instr-1", userId: user.id },
    });
    const student = await testPrisma.student.create({
      data: { id: "student-1", firstName: "Test", lastName: "Student" },
    });
    const reservation = await testPrisma.reservation.create({
      data: {
        id: "res-1",
        studentId: student.id,
        instructorId: instructor.id,
        lessonType: "PRIVATE",
        startTime: new Date(),
        endTime: new Date(),
        plannedHours: 2,
        status: "COMPLETED", // already done
      },
    });

    const { checkIn } = await import("@/app/actions/reservations");
    const formData = new FormData();
    formData.set("reservationId", reservation.id);

    const result = await checkIn({}, formData);
    expect(result.error).toBe("Bu rezervasyon check-in için uygun değil");
  });
});
