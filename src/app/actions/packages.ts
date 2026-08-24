"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrReception } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const packageSchema = z.object({
  name: z.string().min(1, "Paket adı zorunlu"),
  description: z.string().optional(),
  lessonType: z.enum(["PRIVATE", "SEMI_PRIVATE", "GROUP", "EQUIPMENT_RENTAL", "SUPERVISION"]),
  totalHours: z.coerce.number().min(0.5, "En az 0.5 saat"),
  price: z.coerce.number().min(0, "Fiyat negatif olamaz"),
  currency: z.enum(["EUR", "USD", "TRY"]),
  validityDays: z.coerce.number().optional(),
});

export type PackageFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createPackage(
  _prev: PackageFormState,
  formData: FormData
): Promise<PackageFormState> {
  const user = await requireAdmin();

  const raw = {
    name: formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    lessonType: formData.get("lessonType") as string,
    totalHours: formData.get("totalHours") as string,
    price: formData.get("price") as string,
    currency: formData.get("currency") as string,
    validityDays: formData.get("validityDays") as string || undefined,
  };

  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.lessonPackage.create({
    data: {
      ...parsed.data,
      validityDays: parsed.data.validityDays || null,
    },
  });

  await logAudit({ userId: user.userId, action: "CREATE", entity: "LessonPackage", newValues: parsed.data });
  revalidatePath("/dashboard/paketler");
  redirect("/dashboard/paketler");
}

export async function updatePackage(
  id: string,
  _prev: PackageFormState,
  formData: FormData
): Promise<PackageFormState> {
  const user = await requireAdmin();

  const raw = {
    name: formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    lessonType: formData.get("lessonType") as string,
    totalHours: formData.get("totalHours") as string,
    price: formData.get("price") as string,
    currency: formData.get("currency") as string,
    validityDays: formData.get("validityDays") as string || undefined,
  };

  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.lessonPackage.update({
    where: { id },
    data: { ...parsed.data, validityDays: parsed.data.validityDays || null },
  });

  await logAudit({ userId: user.userId, action: "UPDATE", entity: "LessonPackage", entityId: id });
  revalidatePath("/dashboard/paketler");
  return {};
}

export async function deactivatePackage(id: string) {
  const user = await requireAdmin();
  await prisma.lessonPackage.update({ where: { id }, data: { isActive: false } });
  await logAudit({ userId: user.userId, action: "DEACTIVATE", entity: "LessonPackage", entityId: id });
  revalidatePath("/dashboard/paketler");
}

// ─── SELL PACKAGE TO STUDENT ──────────────────────────────────────────────────

const sellSchema = z.object({
  studentId: z.string().min(1),
  packageId: z.string().min(1),
  purchasePrice: z.coerce.number().min(0),
  currency: z.enum(["EUR", "USD", "TRY"]),
  paidAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]),
  paymentDescription: z.string().optional(),
  cashAccountId: z.string().optional(),
});

export type SellFormState = { error?: string };

export async function sellPackage(
  _prev: SellFormState,
  formData: FormData
): Promise<SellFormState> {
  const user = await requireAdminOrReception();

  const raw = {
    studentId: formData.get("studentId") as string,
    packageId: formData.get("packageId") as string,
    purchasePrice: formData.get("purchasePrice") as string,
    currency: formData.get("currency") as string,
    paidAmount: formData.get("paidAmount") as string,
    paymentMethod: formData.get("paymentMethod") as string,
    paymentDescription: formData.get("paymentDescription") as string || undefined,
    cashAccountId: formData.get("cashAccountId") as string || undefined,
  };

  const parsed = sellSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const pkg = await prisma.lessonPackage.findUnique({ where: { id: parsed.data.packageId } });
  if (!pkg || !pkg.isActive) return { error: "Paket bulunamadı" };

  // Ödenen tutar, paket fiyatını geçemez
  if (parsed.data.paidAmount > parsed.data.purchasePrice) {
    return { error: "Ödenen tutar, paket fiyatını geçemez" };
  }

  const expiresAt = pkg.validityDays
    ? new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000)
    : null;

  const purchase = await prisma.packagePurchase.create({
    data: {
      studentId: parsed.data.studentId,
      packageId: parsed.data.packageId,
      totalHours: pkg.totalHours,
      remainingHours: pkg.totalHours,
      purchasePrice: parsed.data.purchasePrice,
      currency: parsed.data.currency,
      expiresAt,
    },
  });

  // Record initial payment if any
  if (parsed.data.paidAmount > 0) {
    const payment = await prisma.payment.create({
      data: {
        studentId: parsed.data.studentId,
        purchaseId: purchase.id,
        amount: parsed.data.paidAmount,
        currency: parsed.data.currency,
        method: parsed.data.paymentMethod,
        direction: "INCOMING",
        description: parsed.data.paymentDescription || `${pkg.name} paketi ödemesi`,
        recordedById: user.userId,
      },
    });

    // Update cash account if provided
    if (parsed.data.cashAccountId) {
      await updateCashAccount(parsed.data.cashAccountId, parsed.data.paidAmount, parsed.data.currency, "INCOME", payment.id, null, user.userId, `${pkg.name} paketi ödemesi`);
    }
  }

  await logAudit({
    userId: user.userId,
    action: "SELL_PACKAGE",
    entity: "PackagePurchase",
    entityId: purchase.id,
    newValues: { ...parsed.data },
  });

  revalidatePath(`/dashboard/musteriler/${parsed.data.studentId}`);
  redirect(`/dashboard/musteriler/${parsed.data.studentId}`);
}

const recordPaymentSchema = z.object({
  purchaseId: z.string().min(1),
  studentId: z.string().min(1),
  amount: z.coerce.number().positive("Geçerli bir tutar girin"),
  currency: z.enum(["EUR", "USD", "TRY"]),
  method: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]),
  cashAccountId: z.string().optional(),
  description: z.string().optional(),
});

export async function recordPayment(
  _prev: SellFormState,
  formData: FormData
): Promise<SellFormState> {
  const user = await requireAdminOrReception();

  const raw = {
    purchaseId: formData.get("purchaseId") as string,
    studentId: formData.get("studentId") as string,
    amount: formData.get("amount") as string,
    currency: formData.get("currency") as string,
    method: formData.get("method") as string,
    cashAccountId: formData.get("cashAccountId") as string || undefined,
    description: formData.get("description") as string || undefined,
  };

  const parsed = recordPaymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { purchaseId, studentId, amount, currency, method, cashAccountId, description } = parsed.data;

  const payment = await prisma.payment.create({
    data: {
      studentId,
      purchaseId,
      amount,
      currency,
      method,
      direction: "INCOMING",
      description: description || "Ek ödeme",
      recordedById: user.userId,
    },
  });

  if (cashAccountId) {
    await updateCashAccount(cashAccountId, amount, currency, "INCOME", payment.id, null, user.userId, description || "Ek ödeme");
  }

  revalidatePath(`/dashboard/musteriler/${studentId}`);
  return {};
}

async function updateCashAccount(
  accountId: string,
  amount: number,
  currency: string,
  entryType: "INCOME" | "EXPENSE",
  paymentId: string | null,
  expenseId: string | null,
  userId: string,
  description: string
) {
  const account = await prisma.cashAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  await prisma.$transaction([
    prisma.cashAccount.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: entryType === "INCOME" ? amount : -amount,
        },
      },
    }),
    prisma.cashRegisterEntry.create({
      data: {
        accountId,
        entryType,
        amount,
        currency,
        description,
        paymentId,
        expenseId,
        recordedById: userId,
      },
    }),
  ]);
}

export { updateCashAccount };
