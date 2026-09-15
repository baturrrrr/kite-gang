"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── KATALOG (HizmetSablonu) ─────────────────────────────────────────────────

const fiyatRowSchema = z.object({
  zamanBirimi: z.enum(["SABIT", "SAATLIK", "YARIM_GUN", "TAM_GUN"]),
  currency: z.enum(["EUR", "USD", "TRY"]),
  price: z.coerce.number().min(0),
});

const sablonSchema = z.object({
  category: z.enum(["EGITIM", "KIRALAMA", "URUN", "UYELIK", "ETKINLIK"]),
  name: z.string().min(1, "Ad zorunlu"),
  subCategory: z.string().optional(),
  requiredPeople: z.coerce.number().min(1).optional(),
  description: z.string().optional(),
  onlineVisibility: z.enum(["LISTED", "PARTNER_ONLY", "HIDDEN"]).default("LISTED"),
  validityDays: z.coerce.number().min(1).optional(),
  fiyatlar: z.array(fiyatRowSchema).min(1, "En az bir fiyat satırı ekleyin"),
});

export type SablonFormState = { error?: string; fieldErrors?: Record<string, string[]> };

function parseSablonForm(formData: FormData) {
  let fiyatlar: unknown[] = [];
  try {
    fiyatlar = JSON.parse((formData.get("fiyatlarJson") as string) || "[]");
  } catch {
    fiyatlar = [];
  }
  return {
    category: formData.get("category") as string,
    name: formData.get("name") as string,
    subCategory: (formData.get("subCategory") as string) || undefined,
    requiredPeople: (formData.get("requiredPeople") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    onlineVisibility: (formData.get("onlineVisibility") as string) || "LISTED",
    validityDays: (formData.get("validityDays") as string) || undefined,
    fiyatlar,
  };
}

export async function createHizmetSablonu(
  _prev: SablonFormState,
  formData: FormData
): Promise<SablonFormState> {
  const user = await requireAdminOrReception();
  const parsed = sablonSchema.safeParse(parseSablonForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const count = await prisma.hizmetSablonu.count({ where: { category: parsed.data.category } });
  const sablon = await prisma.hizmetSablonu.create({
    data: {
      category: parsed.data.category,
      name: parsed.data.name,
      subCategory: parsed.data.subCategory ?? null,
      requiredPeople: parsed.data.requiredPeople ?? null,
      description: parsed.data.description ?? null,
      onlineVisibility: parsed.data.onlineVisibility,
      validityDays: parsed.data.validityDays ?? null,
      sortOrder: count + 1,
      fiyatlar: { createMany: { data: parsed.data.fiyatlar } },
    },
  });
  await logAudit({ userId: user.userId, action: "CREATE", entity: "HizmetSablonu", entityId: sablon.id });
  revalidatePath("/dashboard/hizmetler", "layout");
  return {};
}

export async function updateHizmetSablonu(
  id: string,
  _prev: SablonFormState,
  formData: FormData
): Promise<SablonFormState> {
  const user = await requireAdminOrReception();
  const parsed = sablonSchema.safeParse(parseSablonForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.$transaction([
    prisma.hizmetSablonu.update({
      where: { id },
      data: {
        category: parsed.data.category,
        name: parsed.data.name,
        subCategory: parsed.data.subCategory ?? null,
        requiredPeople: parsed.data.requiredPeople ?? null,
        description: parsed.data.description ?? null,
        onlineVisibility: parsed.data.onlineVisibility,
        validityDays: parsed.data.validityDays ?? null,
      },
    }),
    prisma.hizmetFiyat.deleteMany({ where: { sablonId: id } }),
    prisma.hizmetFiyat.createMany({
      data: parsed.data.fiyatlar.map((f) => ({ ...f, sablonId: id })),
    }),
  ]);
  await logAudit({ userId: user.userId, action: "UPDATE", entity: "HizmetSablonu", entityId: id });
  revalidatePath("/dashboard/hizmetler", "layout");
  return {};
}

export async function deleteHizmetSablonu(id: string) {
  const user = await requireAdminOrReception();
  await prisma.hizmetSablonu.update({ where: { id }, data: { isActive: false } });
  await logAudit({ userId: user.userId, action: "DEACTIVATE", entity: "HizmetSablonu", entityId: id });
  revalidatePath("/dashboard/hizmetler", "layout");
}

export async function setHizmetSablonuActive(id: string, isActive: boolean) {
  const user = await requireAdminOrReception();
  await prisma.hizmetSablonu.update({ where: { id }, data: { isActive } });
  await logAudit({
    userId: user.userId,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    entity: "HizmetSablonu",
    entityId: id,
  });
  revalidatePath("/dashboard/hizmetler", "layout");
}

// ─── MÜŞTERİYE HİZMET ATAMA ─────────────────────────────────────────────────

const assignSchema = z.object({
  studentId: z.string().min(1),
  sablonId: z.string().min(1, "Hizmet seçin"),
  category: z.enum(["EGITIM", "KIRALAMA", "URUN", "UYELIK", "ETKINLIK"]),
  title: z.string().min(1),
  instructorId: z.string().optional(),
  equipmentId: z.string().optional(),
  amount: z.coerce.number().min(0).default(0),
  currency: z.enum(["EUR", "USD", "TRY"]),
  quantity: z.coerce.number().min(1).optional(),
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
    equipmentId: formData.get("equipmentId") as string || undefined,
    amount: formData.get("amount") as string || "0",
    currency: formData.get("currency") as string,
    quantity: formData.get("quantity") as string || undefined,
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
      equipmentId: parsed.data.equipmentId || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      quantity: parsed.data.quantity ?? null,
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

const updateHizmetSchema = z.object({
  title: z.string().min(1, "Başlık zorunlu"),
  instructorId: z.string().optional(),
  amount: z.coerce.number().min(0),
  currency: z.enum(["EUR", "USD", "TRY"]),
  durationHours: z.coerce.number().min(0).optional(),
  instructorEarning: z.coerce.number().min(0).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["BEKLIYOR", "DEVAM", "TAMAMLANDI", "IPTAL"]),
  paymentMethod: z.string().optional(),
});

export type UpdateHizmetState = { error?: string };

export async function updateHizmet(
  id: string,
  studentId: string,
  _prev: UpdateHizmetState,
  formData: FormData
): Promise<UpdateHizmetState> {
  const user = await requireAdminOrReception();

  const raw = {
    title: formData.get("title") as string,
    instructorId: (formData.get("instructorId") as string) || undefined,
    amount: formData.get("amount") as string,
    currency: formData.get("currency") as string,
    durationHours: (formData.get("durationHours") as string) || undefined,
    instructorEarning: (formData.get("instructorEarning") as string) || undefined,
    scheduledAt: (formData.get("scheduledAt") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    status: formData.get("status") as string,
    paymentMethod: (formData.get("paymentMethod") as string) || undefined,
  };

  const parsed = updateHizmetSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const updateData: Record<string, unknown> = {
    title: parsed.data.title,
    instructorId: parsed.data.instructorId || null,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    durationHours: parsed.data.durationHours ?? null,
    instructorEarning: parsed.data.instructorEarning ?? null,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    notes: parsed.data.notes || null,
    status: parsed.data.status,
    paymentMethod: parsed.data.paymentMethod || null,
  };

  if (parsed.data.status === "DEVAM") updateData.checkedInAt = new Date();
  if (parsed.data.status === "TAMAMLANDI") updateData.checkedOutAt = new Date();

  await prisma.hizmet.update({ where: { id }, data: updateData });
  await logAudit({
    userId: user.userId,
    action: "UPDATE",
    entity: "Hizmet",
    entityId: id,
    newValues: { studentId, status: parsed.data.status },
  });
  revalidatePath(`/dashboard/musteriler/${studentId}`);
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
