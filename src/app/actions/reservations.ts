"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdminOrReception } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const VALID_STATUSES = ["PLANNED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "WIND_CANCELLED"] as const;

// Paket saati yalnızca öğrencinin kendi, aktif ve saati kalmış paketinden düşülebilir.
function usablePurchaseWhere(studentId: string) {
  return { studentId, isActive: true, remainingHours: { gt: 0 } };
}

const reservationSchema = z.object({
  studentId: z.string().min(1, "Öğrenci seçin"),
  instructorId: z.string().optional(),
  lessonType: z.enum(["PRIVATE", "SEMI_PRIVATE", "GROUP", "EQUIPMENT_RENTAL", "SUPERVISION"]),
  startTime: z.string().min(1, "Başlangıç zamanı gerekli"),
  plannedHours: z.coerce.number().min(0.5).max(24),
  notes: z.string().optional(),
  purchaseId: z.string().optional(),
  equipmentId: z.string().optional(),
  rentalAmount: z.coerce.number().min(0).optional(),
  rentalCurrency: z.enum(["EUR", "USD", "TRY"]).optional(),
});

export type ReservationFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createReservation(
  _prev: ReservationFormState,
  formData: FormData
): Promise<ReservationFormState> {
  const user = await requireAdminOrReception();

  const raw = {
    studentId: formData.get("studentId") as string,
    instructorId: (formData.get("instructorId") as string) || undefined,
    lessonType: formData.get("lessonType") as string,
    startTime: formData.get("startTime") as string,
    plannedHours: formData.get("plannedHours") as string,
    notes: formData.get("notes") as string || undefined,
    purchaseId: formData.get("purchaseId") as string || undefined,
    equipmentId: formData.get("equipmentId") as string || undefined,
    rentalAmount: formData.get("rentalAmount") as string || undefined,
    rentalCurrency: formData.get("rentalCurrency") as string || undefined,
  };

  const parsed = reservationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.lessonType === "EQUIPMENT_RENTAL") {
    if (!parsed.data.equipmentId) {
      return { fieldErrors: { equipmentId: ["Kiralanan ekipmanı seçin"] } };
    }
    if (parsed.data.rentalAmount === undefined) {
      return { fieldErrors: { rentalAmount: ["Kiralama ücretini girin"] } };
    }
  } else if (!parsed.data.instructorId) {
    return { fieldErrors: { instructorId: ["Eğitmen seçin"] } };
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(startTime.getTime() + parsed.data.plannedHours * 60 * 60 * 1000);

  // Check instructor availability — sadece bir eğitmen seçildiyse anlamlı
  if (parsed.data.instructorId) {
    const conflict = await prisma.reservation.findFirst({
      where: {
        instructorId: parsed.data.instructorId,
        isActive: true,
        status: { notIn: ["CANCELLED", "NO_SHOW", "WIND_CANCELLED"] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });

    if (conflict) {
      return { error: "Bu eğitmen seçilen saatte başka bir derse atanmış. Lütfen farklı bir saat veya eğitmen seçin." };
    }
  }

  const reservation = await prisma.reservation.create({
    data: {
      studentId: parsed.data.studentId,
      instructorId: parsed.data.instructorId || null,
      lessonType: parsed.data.lessonType,
      startTime,
      endTime,
      plannedHours: parsed.data.plannedHours,
      notes: parsed.data.notes || null,
      createdById: user.userId,
      equipmentId: parsed.data.lessonType === "EQUIPMENT_RENTAL" ? parsed.data.equipmentId : null,
      rentalAmount: parsed.data.lessonType === "EQUIPMENT_RENTAL" ? parsed.data.rentalAmount : null,
      rentalCurrency: parsed.data.lessonType === "EQUIPMENT_RENTAL" ? parsed.data.rentalCurrency ?? "TRY" : null,
    },
  });

  await logAudit({
    userId: user.userId,
    action: "CREATE",
    entity: "Reservation",
    entityId: reservation.id,
  });

  revalidatePath("/dashboard/rezervasyonlar");
  revalidatePath("/dashboard/operasyon");
  redirect("/dashboard/rezervasyonlar");
}

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  cancelReason?: string
) {
  const user = await requireAuth();

  // Whitelist geçerli durumlar
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return { error: "Geçersiz durum" };
  }

  // INSTRUCTOR yalnızca kendi rezervasyonunu güncelleyebilir
  if (user.role === "INSTRUCTOR") {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { instructor: true },
    });
    if (!reservation || !reservation.instructor || reservation.instructor.userId !== user.userId) {
      return { error: "Yetkisiz işlem" };
    }
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status, cancelReason: cancelReason || null },
  });

  await logAudit({
    userId: user.userId,
    action: "UPDATE_STATUS",
    entity: "Reservation",
    entityId: reservationId,
    newValues: { status },
  });

  revalidatePath("/dashboard/operasyon");
  revalidatePath("/dashboard/rezervasyonlar");
}

export async function cancelReservation(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const user = await requireAdminOrReception();

  const id = formData.get("reservationId") as string;
  const reason = formData.get("reason") as string;
  const status = formData.get("status") as string;

  if (!["CANCELLED", "NO_SHOW", "WIND_CANCELLED"].includes(status)) {
    return { error: "Geçersiz durum" };
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return { error: "Rezervasyon bulunamadı" };
  // Check-in sonrası ders kaydı, check-out sonrası hakediş oluşur; bunlar iptalle geri alınmaz.
  if (reservation.status !== "PLANNED") {
    return { error: "Yalnızca planlanmış rezervasyonlar iptal edilebilir" };
  }

  // İş kuralı: no-show → paket saati düşülür, wind_cancelled → düşülmez.
  // Gelmeyen öğrencinin ders kaydı hiç oluşmadığı için saat, kullanılabilir en eski paketinden düşülür.
  const noShowPurchase =
    status === "NO_SHOW" && reservation.lessonType !== "EQUIPMENT_RENTAL"
      ? await prisma.packagePurchase.findFirst({
          where: usablePurchaseWhere(reservation.studentId),
          orderBy: { purchasedAt: "asc" },
        })
      : null;
  const deductedHours = noShowPurchase
    ? Math.min(reservation.plannedHours, noShowPurchase.remainingHours)
    : 0;

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status, cancelReason: reason || null },
    }),
    ...(noShowPurchase
      ? [
          prisma.packagePurchase.update({
            where: { id: noShowPurchase.id },
            data: { remainingHours: { decrement: deductedHours } },
          }),
        ]
      : []),
  ]);

  await logAudit({
    userId: user.userId,
    action: "CANCEL",
    entity: "Reservation",
    entityId: id,
    newValues: { status, purchaseId: noShowPurchase?.id ?? null, deductedHours },
  });

  revalidatePath("/dashboard/operasyon");
  revalidatePath("/dashboard/rezervasyonlar");
  return {};
}

// ─── CHECK-IN ────────────────────────────────────────────────────────────────

export async function checkIn(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const user = await requireAuth();

  const reservationId = formData.get("reservationId") as string;
  const kiteSize = formData.get("kiteSize") as string;
  const boardType = formData.get("boardType") as string;
  const harness = formData.get("harness") === "on";
  const wetsuit = formData.get("wetsuit") === "on";
  const equipmentNotes = formData.get("equipmentNotes") as string;
  const purchaseId = formData.get("purchaseId") as string;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { instructor: true },
  });

  if (!reservation) return { error: "Rezervasyon bulunamadı" };
  if (reservation.status !== "PLANNED") return { error: "Bu rezervasyon check-in için uygun değil" };

  // INSTRUCTOR yalnızca kendi dersine check-in yapabilir
  if (user.role === "INSTRUCTOR" && (!reservation.instructor || reservation.instructor.userId !== user.userId)) {
    return { error: "Bu rezervasyon size ait değil" };
  }

  // Formdan gelen paket doğrulanmadan bağlanırsa check-out'ta başka müşterinin saati düşer.
  // Ekipman kiralaması paket saatinden düşmez; operasyon ekranı yine de aktif paketi gönderir.
  let lessonPurchaseId: string | null = null;
  if (purchaseId && reservation.lessonType !== "EQUIPMENT_RENTAL") {
    const purchase = await prisma.packagePurchase.findFirst({
      where: { id: purchaseId, ...usablePurchaseWhere(reservation.studentId) },
    });
    if (!purchase) return { error: "Seçilen paket bu müşteriye ait değil veya kalan saati yok" };
    lessonPurchaseId = purchase.id;
  }

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "CHECKED_IN" },
    }),
    prisma.lesson.create({
      data: {
        reservationId,
        studentId: reservation.studentId,
        instructorId: reservation.instructorId,
        purchaseId: lessonPurchaseId,
        checkInTime: new Date(),
        kiteSize: kiteSize || null,
        boardType: boardType || null,
        harness,
        wetsuit,
        equipmentNotes: equipmentNotes || null,
      },
    }),
  ]);

  await logAudit({
    userId: user.userId,
    action: "CHECK_IN",
    entity: "Reservation",
    entityId: reservationId,
  });

  revalidatePath("/dashboard/operasyon");
  revalidatePath("/dashboard/rezervasyonlar");
  return {};
}

// ─── CHECK-OUT ────────────────────────────────────────────────────────────────

export async function checkOut(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const user = await requireAuth();

  const lessonId = formData.get("lessonId") as string;
  const rawHours = formData.get("actualHours") as string;
  const actualHours = parseFloat(rawHours);
  const instructorNotes = formData.get("instructorNotes") as string;

  // NaN ve negatif kontrolü
  if (isNaN(actualHours) || actualHours <= 0) return { error: "Geçerli ders süresi girin" };
  if (actualHours > 24) return { error: "Ders süresi 24 saati geçemez" };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      reservation: true,
      instructor: true,
    },
  });

  if (!lesson) return { error: "Ders bulunamadı" };
  if (lesson.checkOutTime) return { error: "Bu ders zaten tamamlandı" };

  // INSTRUCTOR yalnızca kendi dersine check-out yapabilir
  if (user.role === "INSTRUCTOR" && (!lesson.instructor || lesson.instructor.userId !== user.userId)) {
    return { error: "Bu ders size ait değil" };
  }

  // Calculate instructor earning — eğitmensiz kiralamalarda hakediş yok
  const instructor = lesson.instructor;
  let earningAmount = 0;
  let earningCurrency = "TRY";

  if (instructor) {
    if (instructor.paymentModel === "HOURLY_RATE" && instructor.hourlyRate) {
      earningAmount = actualHours * instructor.hourlyRate;
      earningCurrency = instructor.hourlyRateCurrency ?? "TRY";
    } else if (instructor.paymentModel === "REVENUE_SHARE" && instructor.revenueShare) {
      if (lesson.purchaseId) {
        const purchase = await prisma.packagePurchase.findUnique({ where: { id: lesson.purchaseId } });
        if (purchase) {
          const hourlyRate = purchase.purchasePrice / purchase.totalHours;
          earningAmount = (actualHours * hourlyRate * instructor.revenueShare) / 100;
          earningCurrency = purchase.currency;
        }
      }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          actualHours,
          checkOutTime: new Date(),
          instructorNotes: instructorNotes || null,
        },
      });
      await tx.reservation.update({
        where: { id: lesson.reservationId },
        data: { status: "COMPLETED" },
      });
      if (lesson.instructorId) {
        await tx.instructorEarning.create({
          data: {
            instructorId: lesson.instructorId,
            lessonId,
            amount: earningAmount,
            currency: earningCurrency,
            hours: actualHours,
            isPaid: false,
          },
        });
      }
      if (lesson.purchaseId) {
        // Kalan saatin negatife düşmesini engelle
        const purchase = await tx.packagePurchase.findUnique({ where: { id: lesson.purchaseId } });
        if (purchase && purchase.remainingHours < actualHours) {
          throw new Error(`Paket saati yetersiz. Kalan: ${purchase.remainingHours} saat, girilen: ${actualHours} saat`);
        }
        await tx.packagePurchase.update({
          where: { id: lesson.purchaseId },
          data: { remainingHours: { decrement: actualHours } },
        });
      }
    });
  } catch (err: any) {
    return { error: err.message ?? "İşlem sırasında hata oluştu" };
  }

  await logAudit({
    userId: user.userId,
    action: "CHECK_OUT",
    entity: "Lesson",
    entityId: lessonId,
    newValues: { actualHours, instructorNotes },
  });

  revalidatePath("/dashboard/operasyon");
  revalidatePath("/dashboard/rezervasyonlar");
  revalidatePath("/dashboard");
  return {};
}
