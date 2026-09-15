/**
 * Kur yokken farklı para birimindeki ödeme kasaya yanlış tutarla yazılmamalı
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

vi.mock("@/lib/exchange-rates", () => ({
  getExchangeRates: vi.fn().mockResolvedValue({
    TRY: 1,
    USD: 0,
    EUR: 0,
    updatedAt: "2026-09-15T10:00:00.000Z",
    source: "unavailable",
  }),
}));

let testPrisma: PrismaClient;
let rawDb: Database.Database;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

beforeAll(() => {
  const { db, prisma } = createTestDb();
  rawDb = db;
  testPrisma = prisma;
});

afterAll(() => {
  closeTestDb(rawDb);
});

beforeEach(async () => {
  await testPrisma.cashRegisterEntry.deleteMany();
  await testPrisma.payment.deleteMany();
  await testPrisma.cashAccount.deleteMany();
  await testPrisma.student.deleteMany();
  await testPrisma.student.create({ data: { id: "student-1", firstName: "Ali", lastName: "Yılmaz" } });
  await testPrisma.cashAccount.create({
    data: { id: "kasa-try", name: "Nakit Kasa TRY", accountType: "CASH", currency: "TRY", balance: 1000 },
  });
});

function odemeForm(currency: string) {
  const formData = new FormData();
  formData.set("studentId", "student-1");
  formData.set("amount", "100");
  formData.set("currency", currency);
  formData.set("method", "CASH");
  formData.set("cashAccountId", "kasa-try");
  return formData;
}

describe("recordMusteriOdeme — kur yokken", () => {
  it("EUR ödemeyi TRY kasaya yazmaz ve ödeme kaydı oluşturmaz", async () => {
    const { recordMusteriOdeme } = await import("@/app/actions/odemeler");

    const result = await recordMusteriOdeme({}, odemeForm("EUR"));

    expect(result.error).toMatch(/Kur bilgisi alınamadığı/);
    expect(await testPrisma.payment.count()).toBe(0);
    const account = await testPrisma.cashAccount.findUnique({ where: { id: "kasa-try" } });
    expect(account?.balance).toBe(1000);
  });

  it("aynı para birimindeki ödemeyi normal işler", async () => {
    const { recordMusteriOdeme } = await import("@/app/actions/odemeler");

    const result = await recordMusteriOdeme({}, odemeForm("TRY"));

    expect(result.error).toBeUndefined();
    expect(await testPrisma.payment.count()).toBe(1);
    const account = await testPrisma.cashAccount.findUnique({ where: { id: "kasa-try" } });
    expect(account?.balance).toBe(1100);
  });
});
