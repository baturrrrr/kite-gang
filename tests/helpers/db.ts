import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const TEST_DB_PATH = path.resolve(__dirname, "../test.db");
const MIGRATION_SQL = fs.readFileSync(
  path.resolve(__dirname, "../../prisma/migrations/20260713121901_init/migration.sql"),
  "utf-8"
);

export function createTestDb(): { db: Database.Database; prisma: PrismaClient } {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  const db = new Database(TEST_DB_PATH);
  db.pragma("foreign_keys = ON");
  db.exec(MIGRATION_SQL);

  const adapter = new PrismaBetterSqlite3({ url: `file:${TEST_DB_PATH}` });
  const prisma = new PrismaClient({ adapter } as any);

  return { db, prisma };
}

export function closeTestDb(db: Database.Database) {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
}
