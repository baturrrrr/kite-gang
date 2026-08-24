import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

const sablonlar = [
  // Eğitim
  { category: "EGITIM", name: "Özel Ders",   defaultPrice: 0, currency: "EUR", sortOrder: 1 },
  { category: "EGITIM", name: "Grup Dersi",   defaultPrice: 0, currency: "EUR", sortOrder: 2 },
  { category: "EGITIM", name: "Allride Ders", defaultPrice: 0, currency: "EUR", sortOrder: 3 },
  // Kiralama
  { category: "KIRALAMA", name: "Ekipman Tam Gün",    defaultPrice: 0, currency: "EUR", sortOrder: 1 },
  { category: "KIRALAMA", name: "Ekipman Yarım Gün",  defaultPrice: 0, currency: "EUR", sortOrder: 2 },
  { category: "KIRALAMA", name: "Storage Haftalık",   defaultPrice: 0, currency: "EUR", sortOrder: 3 },
  { category: "KIRALAMA", name: "Storage Günlük",     defaultPrice: 0, currency: "EUR", sortOrder: 4 },
];

async function main() {
  for (const s of sablonlar) {
    const existing = await prisma.hizmetSablonu.findFirst({
      where: { category: s.category, name: s.name },
    });
    if (!existing) {
      await prisma.hizmetSablonu.create({ data: s });
      console.log(`✓ ${s.category} — ${s.name}`);
    } else {
      console.log(`  Mevcut: ${s.category} — ${s.name}`);
    }
  }
  console.log("Tamamlandı.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
