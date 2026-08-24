import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url });

const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌊 Seed verisi oluşturuluyor...");

  // ─── USERS ───────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@kitesurf.com" },
    update: {},
    create: {
      name: "Admin Kullanıcı",
      email: "admin@kitesurf.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const receptionPassword = await bcrypt.hash("resepsiyon123", 12);
  await prisma.user.upsert({
    where: { email: "resepsiyon@kitesurf.com" },
    update: {},
    create: {
      name: "Ayşe Yılmaz",
      email: "resepsiyon@kitesurf.com",
      password: receptionPassword,
      role: "RECEPTION",
    },
  });

  // ─── INSTRUCTORS ─────────────────────────────────────────────────────────────
  const instr1Password = await bcrypt.hash("egitmen123", 12);
  const instr1User = await prisma.user.upsert({
    where: { email: "ahmet@kitesurf.com" },
    update: {},
    create: {
      name: "Ahmet Kaya",
      email: "ahmet@kitesurf.com",
      password: instr1Password,
      role: "INSTRUCTOR",
    },
  });

  const instructor1 = await prisma.instructor.upsert({
    where: { userId: instr1User.id },
    update: {},
    create: {
      userId: instr1User.id,
      phone: "+90 532 111 22 33",
      paymentModel: "HOURLY_RATE",
      hourlyRate: 25,
      hourlyRateCurrency: "EUR",
      color: "#3B82F6",
    },
  });

  const instr2Password = await bcrypt.hash("egitmen123", 12);
  const instr2User = await prisma.user.upsert({
    where: { email: "fatma@kitesurf.com" },
    update: {},
    create: {
      name: "Fatma Demir",
      email: "fatma@kitesurf.com",
      password: instr2Password,
      role: "INSTRUCTOR",
    },
  });

  const instructor2 = await prisma.instructor.upsert({
    where: { userId: instr2User.id },
    update: {},
    create: {
      userId: instr2User.id,
      phone: "+90 533 222 33 44",
      paymentModel: "REVENUE_SHARE",
      revenueShare: 30,
      color: "#10B981",
    },
  });

  const instr3Password = await bcrypt.hash("egitmen123", 12);
  const instr3User = await prisma.user.upsert({
    where: { email: "mehmet@kitesurf.com" },
    update: {},
    create: {
      name: "Mehmet Arslan",
      email: "mehmet@kitesurf.com",
      password: instr3Password,
      role: "INSTRUCTOR",
    },
  });

  const instructor3 = await prisma.instructor.upsert({
    where: { userId: instr3User.id },
    update: {},
    create: {
      userId: instr3User.id,
      phone: "+90 534 333 44 55",
      paymentModel: "SALARY_PLUS_BONUS",
      monthlySalary: 2500,
      salaryCurrency: "TRY",
      color: "#F59E0B",
    },
  });

  console.log("✅ 3 eğitmen oluşturuldu");

  // ─── LESSON PACKAGES ─────────────────────────────────────────────────────────
  const pkg1 = await prisma.lessonPackage.create({
    data: {
      name: "Başlangıç Paketi (6 Saat)",
      description: "Yeni başlayanlar için temel kitesurf kursu",
      lessonType: "PRIVATE",
      totalHours: 6,
      price: 420,
      currency: "EUR",
      validityDays: 30,
    },
  });

  const pkg2 = await prisma.lessonPackage.create({
    data: {
      name: "Özel Ders (1 Saat)",
      lessonType: "PRIVATE",
      totalHours: 1,
      price: 80,
      currency: "EUR",
    },
  });

  const pkg3 = await prisma.lessonPackage.create({
    data: {
      name: "Yarı Özel Paket (4 Saat)",
      description: "2 kişilik grup, kişi başı",
      lessonType: "SEMI_PRIVATE",
      totalHours: 4,
      price: 200,
      currency: "EUR",
      validityDays: 14,
    },
  });

  const pkg4 = await prisma.lessonPackage.create({
    data: {
      name: "Grup Dersi (2 Saat)",
      lessonType: "GROUP",
      totalHours: 2,
      price: 60,
      currency: "EUR",
    },
  });

  const pkg5 = await prisma.lessonPackage.create({
    data: {
      name: "Ekipman Kirası (Günlük)",
      lessonType: "EQUIPMENT_RENTAL",
      totalHours: 8,
      price: 50,
      currency: "EUR",
    },
  });

  const pkg6 = await prisma.lessonPackage.create({
    data: {
      name: "Supervision (Saatlik)",
      lessonType: "SUPERVISION",
      totalHours: 1,
      price: 20,
      currency: "EUR",
    },
  });

  console.log("✅ 6 paket oluşturuldu");

  // ─── STUDENTS ────────────────────────────────────────────────────────────────
  const students = await Promise.all([
    prisma.student.create({
      data: {
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "+44 7700 900000",
        nationality: "İngiliz",
        language: "İngilizce",
        skillLevel: "BEGINNER",
        waiverSigned: true,
        waiverSignedAt: new Date(),
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria.garcia@example.com",
        phone: "+34 600 000000",
        nationality: "İspanyol",
        language: "İspanyolca",
        skillLevel: "INTERMEDIATE",
        waiverSigned: true,
        waiverSignedAt: new Date(),
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Hans",
        lastName: "Müller",
        email: "hans.muller@example.com",
        phone: "+49 151 0000000",
        nationality: "Alman",
        language: "Almanca",
        skillLevel: "ADVANCED",
        waiverSigned: true,
        waiverSignedAt: new Date(),
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Sophie",
        lastName: "Dubois",
        email: "sophie.dubois@example.com",
        nationality: "Fransız",
        language: "Fransızca",
        skillLevel: "BEGINNER",
        waiverSigned: false,
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Luca",
        lastName: "Rossi",
        email: "luca.rossi@example.com",
        phone: "+39 333 0000000",
        nationality: "İtalyan",
        language: "İtalyanca",
        skillLevel: "INDEPENDENT",
        waiverSigned: true,
        waiverSignedAt: new Date(),
        notes: "Freestyle rider, kendi ekipmanını getiriyor",
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Anna",
        lastName: "Kowalski",
        email: "anna.kowalski@example.com",
        nationality: "Polonyalı",
        language: "Almanca",
        skillLevel: "BEGINNER",
        waiverSigned: true,
        waiverSignedAt: new Date(),
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Tom",
        lastName: "Johnson",
        nationality: "Avustralyalı",
        language: "İngilizce",
        skillLevel: "INTERMEDIATE",
        waiverSigned: true,
        waiverSignedAt: new Date(),
        emergencyContact: "Jane Johnson",
        emergencyPhone: "+61 400 000000",
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Elena",
        lastName: "Petrov",
        email: "elena.petrov@example.com",
        nationality: "Rus",
        language: "İngilizce",
        skillLevel: "BEGINNER",
        waiverSigned: false,
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Carlos",
        lastName: "Santos",
        email: "carlos.santos@example.com",
        phone: "+55 11 90000-0000",
        nationality: "Brezilyalı",
        language: "İngilizce",
        skillLevel: "ADVANCED",
        waiverSigned: true,
        waiverSignedAt: new Date(),
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Yuki",
        lastName: "Tanaka",
        email: "yuki.tanaka@example.com",
        nationality: "Japon",
        language: "İngilizce",
        skillLevel: "INTERMEDIATE",
        waiverSigned: true,
        waiverSignedAt: new Date(),
      },
    }),
  ]);

  console.log("✅ 10 öğrenci oluşturuldu");

  // ─── CASH ACCOUNTS ───────────────────────────────────────────────────────────
  const cashEUR = await prisma.cashAccount.create({
    data: { name: "Nakit Kasa EUR", accountType: "CASH", currency: "EUR", balance: 2500 },
  });

  const bankEUR = await prisma.cashAccount.create({
    data: { name: "Banka EUR", accountType: "BANK", currency: "EUR", balance: 15000 },
  });

  const cashTRY = await prisma.cashAccount.create({
    data: { name: "Nakit Kasa TRY", accountType: "CASH", currency: "TRY", balance: 50000 },
  });

  console.log("✅ Kasa hesapları oluşturuldu");

  // ─── PACKAGE PURCHASES ───────────────────────────────────────────────────────
  const now = new Date();

  const purchase1 = await prisma.packagePurchase.create({
    data: {
      studentId: students[0].id,
      packageId: pkg1.id,
      totalHours: 6,
      remainingHours: 4,
      purchasePrice: 420,
      currency: "EUR",
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    },
  });

  const purchase2 = await prisma.packagePurchase.create({
    data: {
      studentId: students[1].id,
      packageId: pkg3.id,
      totalHours: 4,
      remainingHours: 3,
      purchasePrice: 200,
      currency: "EUR",
    },
  });

  const purchase3 = await prisma.packagePurchase.create({
    data: {
      studentId: students[2].id,
      packageId: pkg2.id,
      totalHours: 1,
      remainingHours: 1,
      purchasePrice: 80,
      currency: "EUR",
    },
  });

  const purchase4 = await prisma.packagePurchase.create({
    data: {
      studentId: students[4].id,
      packageId: pkg6.id,
      totalHours: 1,
      remainingHours: 1,
      purchasePrice: 20,
      currency: "EUR",
    },
  });

  // ─── PAYMENTS ────────────────────────────────────────────────────────────────
  await prisma.payment.create({
    data: {
      studentId: students[0].id,
      purchaseId: purchase1.id,
      amount: 420,
      currency: "EUR",
      method: "CREDIT_CARD",
      direction: "INCOMING",
      description: "Başlangıç paketi ödemesi",
      recordedById: admin.id,
    },
  });

  await prisma.payment.create({
    data: {
      studentId: students[1].id,
      purchaseId: purchase2.id,
      amount: 100,
      currency: "EUR",
      method: "CASH",
      direction: "INCOMING",
      description: "Yarı özel paket - ilk ödeme",
      recordedById: admin.id,
    },
  });
  // purchase2 has pending 100 EUR

  await prisma.payment.create({
    data: {
      studentId: students[2].id,
      purchaseId: purchase3.id,
      amount: 80,
      currency: "EUR",
      method: "BANK_TRANSFER",
      direction: "INCOMING",
      description: "Özel ders ödemesi",
      recordedById: admin.id,
    },
  });

  // ─── TODAY'S RESERVATIONS ────────────────────────────────────────────────────
  const todayAt10 = new Date(now);
  todayAt10.setHours(10, 0, 0, 0);
  const todayAt12 = new Date(now);
  todayAt12.setHours(12, 0, 0, 0);
  const todayAt14 = new Date(now);
  todayAt14.setHours(14, 0, 0, 0);
  const todayAt16 = new Date(now);
  todayAt16.setHours(16, 0, 0, 0);

  const res1 = await prisma.reservation.create({
    data: {
      studentId: students[0].id,
      instructorId: instructor1.id,
      lessonType: "PRIVATE",
      startTime: todayAt10,
      endTime: new Date(todayAt10.getTime() + 2 * 60 * 60 * 1000),
      plannedHours: 2,
      status: "PLANNED",
      createdById: admin.id,
    },
  });

  const res2 = await prisma.reservation.create({
    data: {
      studentId: students[1].id,
      instructorId: instructor2.id,
      lessonType: "SEMI_PRIVATE",
      startTime: todayAt12,
      endTime: new Date(todayAt12.getTime() + 2 * 60 * 60 * 1000),
      plannedHours: 2,
      status: "CHECKED_IN",
      createdById: admin.id,
    },
  });

  // Create lesson for checked-in reservation
  await prisma.lesson.create({
    data: {
      reservationId: res2.id,
      studentId: students[1].id,
      instructorId: instructor2.id,
      purchaseId: purchase2.id,
      checkInTime: new Date(todayAt12.getTime()),
      kiteSize: "9m",
      boardType: "Twin tip",
      harness: true,
    },
  });

  const res3 = await prisma.reservation.create({
    data: {
      studentId: students[2].id,
      instructorId: instructor1.id,
      lessonType: "PRIVATE",
      startTime: todayAt14,
      endTime: new Date(todayAt14.getTime() + 1 * 60 * 60 * 1000),
      plannedHours: 1,
      status: "PLANNED",
      createdById: admin.id,
    },
  });

  // Yesterday completed lesson
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(11, 0, 0, 0);

  const res4 = await prisma.reservation.create({
    data: {
      studentId: students[0].id,
      instructorId: instructor1.id,
      lessonType: "PRIVATE",
      startTime: yesterday,
      endTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
      plannedHours: 2,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });

  const completedLesson = await prisma.lesson.create({
    data: {
      reservationId: res4.id,
      studentId: students[0].id,
      instructorId: instructor1.id,
      purchaseId: purchase1.id,
      checkInTime: yesterday,
      checkOutTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
      actualHours: 2,
      kiteSize: "12m",
      boardType: "Twin tip",
      harness: true,
      wetsuit: false,
      instructorNotes: "Body drag çok iyi. Water start denedi, 3. denemede başardı.",
    },
  });

  // Update purchase1 remaining hours
  await prisma.packagePurchase.update({
    where: { id: purchase1.id },
    data: { remainingHours: 4 }, // 6 - 2 = 4
  });

  // Create instructor earning for completed lesson
  await prisma.instructorEarning.create({
    data: {
      instructorId: instructor1.id,
      lessonId: completedLesson.id,
      amount: 50, // 2h * 25 EUR
      currency: "EUR",
      hours: 2,
      isPaid: false,
    },
  });

  console.log("✅ Örnek rezervasyonlar ve dersler oluşturuldu");

  // ─── EQUIPMENT ───────────────────────────────────────────────────────────────
  await prisma.equipment.createMany({
    data: [
      { type: "KITE", name: "Cabrinha Switchblade 12m", brand: "Cabrinha", size: "12m", status: "AVAILABLE" },
      { type: "KITE", name: "Cabrinha Switchblade 9m", brand: "Cabrinha", size: "9m", status: "IN_USE" },
      { type: "KITE", name: "North Dice 7m", brand: "North", size: "7m", status: "AVAILABLE" },
      { type: "KITE", name: "Duotone Evo 14m", brand: "Duotone", size: "14m", status: "REPAIR" },
      { type: "BOARD", name: "Cabrinha Spectrum 136", brand: "Cabrinha", size: "136cm", status: "AVAILABLE" },
      { type: "BOARD", name: "North Atmos 138", brand: "North", size: "138cm", status: "AVAILABLE" },
      { type: "BOARD", name: "F-One Trax 142", brand: "F-One", size: "142cm", status: "IN_USE" },
      { type: "HARNESS", name: "Mystic Majestic XL", brand: "Mystic", size: "XL", status: "AVAILABLE" },
      { type: "HARNESS", name: "Mystic Majestic L", brand: "Mystic", size: "L", status: "AVAILABLE" },
      { type: "HARNESS", name: "Mystic Majestic M", brand: "Mystic", size: "M", status: "IN_USE" },
      { type: "WETSUIT", name: "Rip Curl L", brand: "Rip Curl", size: "L", status: "AVAILABLE" },
      { type: "WETSUIT", name: "Rip Curl M", brand: "Rip Curl", size: "M", status: "AVAILABLE" },
      { type: "BAR", name: "Cabrinha Bar 50cm #1", brand: "Cabrinha", status: "AVAILABLE" },
      { type: "BAR", name: "Cabrinha Bar 50cm #2", brand: "Cabrinha", status: "IN_USE" },
    ],
  });

  console.log("✅ 14 ekipman oluşturuldu");

  // ─── EXPENSES ────────────────────────────────────────────────────────────────
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  await prisma.expense.createMany({
    data: [
      {
        category: "RENT",
        amount: 1500,
        currency: "EUR",
        method: "BANK_TRANSFER",
        description: "Aylık kira - Haziran",
        expenseDate: lastMonth,
        recordedById: admin.id,
      },
      {
        category: "FUEL",
        amount: 200,
        currency: "EUR",
        method: "CASH",
        description: "Bot yakıtı",
        expenseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        recordedById: admin.id,
      },
      {
        category: "EQUIPMENT_REPAIR",
        amount: 85,
        currency: "EUR",
        method: "CASH",
        description: "Duotone Evo 14m tamir",
        expenseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        recordedById: admin.id,
      },
    ],
  });

  console.log("✅ Örnek giderler oluşturuldu");

  console.log("\n🎉 Seed tamamlandı!");
  console.log("\n📋 Giriş Bilgileri:");
  console.log("   Admin:       admin@kitesurf.com / admin123");
  console.log("   Resepsiyon:  resepsiyon@kitesurf.com / resepsiyon123");
  console.log("   Eğitmen 1:   ahmet@kitesurf.com / egitmen123");
  console.log("   Eğitmen 2:   fatma@kitesurf.com / egitmen123");
  console.log("   Eğitmen 3:   mehmet@kitesurf.com / egitmen123");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
