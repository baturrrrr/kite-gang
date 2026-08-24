"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── KATALOG (HizmetSablonu) ─────────────────────────────────────────────────

const sablonSchema = z.object({
  category: z.enum(["EGITIM", "KIRALAMA", "URUN"]),
  name: z.string().min(1, "Ad zorunlu"),
  defaultPrice: z.coerce.number().min(0).default(0),
  halfDayPrice: z.coerce.number().min(0).optional(),
  fullDayPrice: z.coerce.number().min(0).optional(),
  currency: z.enum(["EUR", "USD", "TRY"]),
});

export type SablonFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createHizmetSablonu(
  _prev: SablonFormState,
  formData: FormData
): Promise<SablonFormState> {
  const user = await requireAdminOrReception();
  const raw = {
    category: formData.get("category") as string,
    name: formData.get("name") as string,
    defaultPrice: formData.get("defaultPrice") as string || "0",
    halfDayPrice: formData.get("halfDayPrice") as string || undefined,
    fullDayPrice: formData.get("fullDayPrice") as string || undefined,
    currency: formData.get("currency") as string,
  };
  const parsed = sablonSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const count = await prisma.hizmetSablonu.count({ where: { category: parsed.data.category } });
  await prisma.hizmetSablonu.create({ data: { ...parsed.data, sortOrder: count + 1 } });
  await logAudit({ userId: user.userId, action: "CREATE", entity: "HizmetSablonu" });
  revalidatePath("/dashboard/hizmetler");
  return {};
}

export async function updateHizmetSablonu(
  id: string,
  _prev: SablonFormState,
  formData: FormData
): Promise<SablonFormState> {
  const user = await requireAdminOrReception();
  const raw = {
    category: formData.get("category") as string,
    name: formData.get("name") as string,
    defaultPrice: formData.get("defaultPrice") as string || "0",
    halfDayPrice: formData.get("halfDayPrice") as string || undefined,
    fullDayPrice: formData.get("fullDayPrice") as string || undefined,
    currency: formData.get("currency") as string,
  };
  const parsed = sablonSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.hizmetSablonu.update({ where: { id }, data: parsed.data });
  await logAudit({ userId: user.userId, action: "UPDATE", entity: "HizmetSablonu", entityId: id });
  revalidatePath("/dashboard/hizmetler");
  return {};
}

export async function deleteHizmetSablonu(id: string) {
  const user = await requireAdminOrReception();
  await prisma.hizmetSablonu.update({ where: { id }, data: { isActive: false } });
  await logAudit({ userId: user.userId, action: "DEACTIVATE", entity: "HizmetSablonu", entityId: id });
  revalidatePath("/dashboard/hizmetler");
}

// ─── MÜŞTERİYE HİZMET ATAMA ─────────────────────────────────────────────────

const assignSchema = z.object({
  studentId: z.string().min(1),
  sablonId: z.string().min(1, "Hizmet seçin"),
  category: z.enum(["EGITIM", "KIRALAMA", "URUN"]),
  title: z.string().min(1),
  instructorId: z.string().optional(),
  amount: z.coerce.number().min(0).default(0),
  currency: z.enum(["EUR", "USD", "TRY"]),
  paymentMethod: z.string().optional(),
  instructorEarning: z.coerce.number().min(0).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["BEKLIYOR", "DEVAM", "TAMAMLANDI", "IPTAL"]).default("BEKLIYOR"),
});

export type AssignFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function assignHizmet(
  _prev: AssignFormState,
  formData: FormData
): Promise<AssignFormState> {
  const user = await requireAdminOrReception();

  const raw = {
    studentId: formData.get("studentId") as string,
    sablonId: formData.get("sablonId") as string,
    category: formData.get("category") as string,
    title: formData.get("title") as string,
    instructorId: formData.get("instructorId") as string || undefined,
    amount: formData.get("amount") as string || "0",
    currency: formData.get("currency") as string,
    paymentMethod: formData.get("paymentMethod") as string || undefined,
    instructorEarning: formData.get("instructorEarning") as string || undefined,
    scheduledAt: formData.get("scheduledAt") as string || undefined,
    notes: formData.get("notes") as string || undefined,
    status: formData.get("status") as string || "BEKLIYOR",
  };

  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.category === "EGITIM" && !parsed.data.instructorId) {
    return { fieldErrors: { instructorId: ["Eğitim için eğitmen seçin"] } };
  }

  // Eğitmen hakediş: form boşsa profil saatlik ücretini kullan
  let earningAmount: number | null = parsed.data.instructorEarning ?? null;
  if (parsed.data.category === "EGITIM" && earningAmount === null && parsed.data.instructorId) {
    const instructor = await prisma.instructor.findUnique({
      where: { id: parsed.data.instructorId },
      select: { hourlyRate: true },
    });
    earningAmount = instructor?.hourlyRate ?? null;
  }

  const hizmet = await prisma.hizmet.create({
    data: {
      category: parsed.data.category,
      sablonId: parsed.data.sablonId,
      title: parsed.data.title,
      studentId: parsed.data.studentId,
      instructorId: parsed.data.instructorId || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod || null,
      instructorEarning: earningAmount,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
      createdById: user.userId,
    },
  });

  await logAudit({ userId: user.userId, action: "CREATE", entity: "Hizmet", entityId: hizmet.id, newValues: { studentId: parsed.data.studentId } });
  revalidatePath(`/dashboard/musteriler/${parsed.data.studentId}`);
  return {};
}

export async function updateHizmetStatus(
  id: string,
  studentId: string,
  status: "BEKLIYOR" | "DEVAM" | "TAMAMLANDI" | "IPTAL"
): Promise<{ error?: string }> {
  const user = await requireAdminOrReception();
  await prisma.hizmet.update({
    where: { id },
    data: {
      status,
      ...(status === "DEVAM" ? { checkedInAt: new Date() } : {}),
      ...(status === "TAMAMLANDI" ? { checkedOutAt: new Date() } : {}),
    },
  });
  await logAudit({ userId: user.userId, action: "UPDATE_STATUS", entity: "Hizmet", entityId: id, newValues: { status } });
  revalidatePath(`/dashboard/musteriler/${studentId}`);
  revalidatePath("/dashboard/hizmetler");
  revalidatePath("/dashboard/takvim");
  return {};
}

export async function deleteHizmet(id: string, studentId: string): Promise<{ error?: string }> {
  const user = await requireAdminOrReception();
  await prisma.hizmet.update({ where: { id }, data: { isActive: false } });
  await logAudit({ userId: user.userId, action: "DEACTIVATE", entity: "Hizmet", entityId: id });
  revalidatePath(`/dashboard/musteriler/${studentId}`);
  revalidatePath("/dashboard/hizmetler");
  return {};
}
