import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Vitest test dosyalarını paralel worker'larda çalıştırır; ortak dosya birbirini silerdi.
const TEST_DB_PATH = path.resolve(__dirname, `../test-${process.env.VITEST_POOL_ID ?? "0"}.db`);
const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");

function readAllMigrationsSql(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((dir) => fs.readFileSync(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf-8"));
}

export function createTestDb(): { db: Database.Database; prisma: PrismaClient } {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  const db = new Database(TEST_DB_PATH);
  db.pragma("foreign_keys = ON");
  for (const sql of readAllMigrationsSql()) db.exec(sql);

  const adapter = new PrismaBetterSqlite3({ url: `file:${TEST_DB_PATH}` });
  const prisma = new PrismaClient({ adapter } as any);

  return { db, prisma };
}

export function closeTestDb(db: Database.Database) {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
}
