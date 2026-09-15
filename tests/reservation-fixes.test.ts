/**
 * Check-in paket doğrulaması ve no-show paket saati düşümü
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";
import { createTestDb, closeTestDb } from "./helpers/db";
import Database from "better-sqlite3";

const MOCK_USER = { userId: "user-test-1", role: "ADMIN", name: "Test Admin", email: "admin@test.com" };

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(MOCK_USER),
  requireAdmin: vi.fn().mockResolvedValue(MOCK_USER),
  requireAdminOrReception: vi.fn().mockResolvedValue(MOCK_USER),
}));

let testPrisma: PrismaClient;
let rawDb: Database.Database;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

async function seed(
  prisma: PrismaClient,
  { lessonType = "PRIVATE", remainingHours = 10 }: { lessonType?: string; remainingHours?: number } = {}
) {
  const user = await prisma.user.create({
    data: { id: "user-test-1", name: "Test Admin", email: "admin@test.com", password: "x", role: "ADMIN" },
  });
  const instructor = await prisma.instructor.create({ data: { id: "instr-1", userId: user.id } });
  const student = await prisma.student.create({ data: { id: "student-1", firstName: "Ali", lastName: "Yılmaz" } });
  const otherStudent = await prisma.student.create({ data: { id: "student-2", firstName: "Ayşe", lastName: "Kara" } });
  const pkg = await prisma.lessonPackage.create({
    data: { id: "pkg-1", name: "Paket", lessonType: "PRIVATE", totalHours: 10, price: 500, currency: "EUR" },
  });
  const purchase = await prisma.packagePurchase.create({
    data: {
      id: "purchase-1",
      studentId: student.id,
      packageId: pkg.id,
      totalHours: 10,
      remainingHours,
      purchasePrice: 500,
      currency: "EUR",
    },
  });
  const otherPurchase = await prisma.packagePurchase.create({
    data: {
      id: "purchase-2",
      studentId: otherStudent.id,
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
      instructorId: lessonType === "EQUIPMENT_RENTAL" ? null : instructor.id,
      lessonType,
      startTime: new Date(),
      endTime: new Date(),
      plannedHours: 2,
      status: "PLANNED",
    },
  });
  return { student, purchase, otherPurchase, reservation };
}

beforeAll(() => {
  const { db, prisma } = createTestDb();
  rawDb = db;
  testPrisma = prisma;
});

afterAll(() => {
  closeTestDb(rawDb);
});

beforeEach(async () => {
  await testPrisma.lesson.deleteMany();
  await testPrisma.reservation.deleteMany();
  await testPrisma.packagePurchase.deleteMany();
  await testPrisma.lessonPackage.deleteMany();
  await testPrisma.student.deleteMany();
  await testPrisma.instructor.deleteMany();
  await testPrisma.user.deleteMany();
});

function checkInForm(reservationId: string, purchaseId?: string) {
  const formData = new FormData();
  formData.set("reservationId", reservationId);
  if (purchaseId) formData.set("purchaseId", purchaseId);
  return formData;
}

function cancelForm(reservationId: string, status: string) {
  const formData = new FormData();
  formData.set("reservationId", reservationId);
  formData.set("status", status);
  return formData;
}

describe("checkIn — paket doğrulaması", () => {
  it("başka müşterinin paketi reddedilir", async () => {
    const { reservation, otherPurchase } = await seed(testPrisma);
    const { checkIn } = await import("@/app/actions/reservations");

    const result = await checkIn({}, checkInForm(reservation.id, otherPurchase.id));

    expect(result.error).toBe("Seçilen paket bu müşteriye ait değil veya kalan saati yok");
    const lesson = await testPrisma.lesson.findFirst({ where: { reservationId: reservation.id } });
    expect(lesson).toBeNull();
  });

  it("kalan saati olmayan paket reddedilir", async () => {
    const { reservation, purchase } = await seed(testPrisma, { remainingHours: 0 });
    const { checkIn } = await import("@/app/actions/reservations");

    const result = await checkIn({}, checkInForm(reservation.id, purchase.id));

    expect(result.error).toBe("Seçilen paket bu müşteriye ait değil veya kalan saati yok");
  });

  it("müşterinin kendi paketi derse bağlanır", async () => {
    const { reservation, purchase } = await seed(testPrisma);
    const { checkIn } = await import("@/app/actions/reservations");

    const result = await checkIn({}, checkInForm(reservation.id, purchase.id));

    expect(result.error).toBeUndefined();
    const lesson = await testPrisma.lesson.findFirst({ where: { reservationId: reservation.id } });
    expect(lesson?.purchaseId).toBe(purchase.id);
  });

  it("ekipman kiralamasına paket bağlanmaz", async () => {
    const { reservation, purchase } = await seed(testPrisma, { lessonType: "EQUIPMENT_RENTAL" });
    const { checkIn } = await import("@/app/actions/reservations");

    const result = await checkIn({}, checkInForm(reservation.id, purchase.id));

    expect(result.error).toBeUndefined();
    const lesson = await testPrisma.lesson.findFirst({ where: { reservationId: reservation.id } });
    expect(lesson?.purchaseId).toBeNull();
  });
});

describe("cancelReservation — no-show", () => {
  it("no-show müşterinin paketinden planlanan saati düşer", async () => {
    const { reservation, purchase } = await seed(testPrisma);
    const { cancelReservation } = await import("@/app/actions/reservations");

    const result = await cancelReservation({}, cancelForm(reservation.id, "NO_SHOW"));

    expect(result.error).toBeUndefined();
    const updated = await testPrisma.packagePurchase.findUnique({ where: { id: purchase.id } });
    expect(updated?.remainingHours).toBe(8);
    const updatedRes = await testPrisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(updatedRes?.status).toBe("NO_SHOW");
  });

  it("no-show kalan saatin altına düşürmez", async () => {
    const { reservation, purchase } = await seed(testPrisma, { remainingHours: 1 });
    const { cancelReservation } = await import("@/app/actions/reservations");

    await cancelReservation({}, cancelForm(reservation.id, "NO_SHOW"));

    const updated = await testPrisma.packagePurchase.findUnique({ where: { id: purchase.id } });
    expect(updated?.remainingHours).toBe(0);
  });

  it("rüzgar iptali paket saatini düşmez", async () => {
    const { reservation, purchase } = await seed(testPrisma);
    const { cancelReservation } = await import("@/app/actions/reservations");

    await cancelReservation({}, cancelForm(reservation.id, "WIND_CANCELLED"));

    const updated = await testPrisma.packagePurchase.findUnique({ where: { id: purchase.id } });
    expect(updated?.remainingHours).toBe(10);
  });

  it("başka müşterinin paketine dokunmaz", async () => {
    const { reservation, otherPurchase } = await seed(testPrisma);
    const { cancelReservation } = await import("@/app/actions/reservations");

    await cancelReservation({}, cancelForm(reservation.id, "NO_SHOW"));

    const other = await testPrisma.packagePurchase.findUnique({ where: { id: otherPurchase.id } });
    expect(other?.remainingHours).toBe(10);
  });

  it("planlanmış olmayan rezervasyon iptal edilemez", async () => {
    const { reservation, purchase } = await seed(testPrisma);
    await testPrisma.reservation.update({ where: { id: reservation.id }, data: { status: "COMPLETED" } });
    const { cancelReservation } = await import("@/app/actions/reservations");

    const result = await cancelReservation({}, cancelForm(reservation.id, "NO_SHOW"));

    expect(result.error).toBe("Yalnızca planlanmış rezervasyonlar iptal edilebilir");
    const updated = await testPrisma.packagePurchase.findUnique({ where: { id: purchase.id } });
    expect(updated?.remainingHours).toBe(10);
  });
});
