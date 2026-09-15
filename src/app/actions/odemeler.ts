"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCashAccount, prepareCashEntry } from "@/lib/cash";

const odemeSchema = z.object({
  studentId: z.string().min(1),
  hizmetId: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Tutar gerekli"),
  currency: z.enum(["EUR", "USD", "TRY"]),
  method: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]),
  description: z.string().optional(),
  cashAccountId: z.string().optional(),
});

export type OdemeFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function recordMusteriOdeme(
  _prev: OdemeFormState,
  formData: FormData
): Promise<OdemeFormState> {
  const user = await requireAdminOrReception();
  const raw = {
    studentId: formData.get("studentId") as string,
    hizmetId: (formData.get("hizmetId") as string) || undefined,
    amount: formData.get("amount") as string,
    currency: formData.get("currency") as string,
    method: formData.get("method") as string,
    description: formData.get("description") as string || undefined,
    cashAccountId: formData.get("cashAccountId") as string || undefined,
  };
  const parsed = odemeSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.cashAccountId) {
    const cash = await prepareCashEntry(parsed.data.cashAccountId, parsed.data.amount, parsed.data.currency);
    if ("error" in cash) return { error: cash.error };
  }

  // Alınan ödemenin tamamı kasaya yansır. Eğitmen hakedişi ayrı bir borç olarak
  // izlenir ve eğitmene fiilen ödeme yapıldığında (Hakediş Ödemesi Yap) kasadan düşülür.
  const payment = await prisma.payment.create({
    data: {
      studentId: parsed.data.studentId,
      hizmetId: parsed.data.hizmetId || null,
      amount: parsed.data.amount,
      kasaAmount: parsed.data.amount,
      currency: parsed.data.currency,
      method: parsed.data.method,
      direction: "INCOMING",
      description: parsed.data.description || null,
      recordedById: user.userId,
    },
  });

  if (parsed.data.cashAccountId) {
    await updateCashAccount(
      parsed.data.cashAccountId,
      parsed.data.amount,
      parsed.data.currency,
      "INCOME",
      payment.id,
      null,
      user.userId,
      parsed.data.description || "Müşteri ödemesi"
    );
  }

  revalidatePath(`/dashboard/musteriler/${parsed.data.studentId}`);
  revalidatePath("/dashboard/musteriler");
  revalidatePath("/dashboard/kasa");
  revalidatePath("/dashboard");
  return {};
}

const manuelGelirSchema = z.object({
  amount: z.coerce.number().min(0.01, "Tutar gerekli"),
  currency: z.enum(["EUR", "USD", "TRY"]),
  method: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]),
  description: z.string().min(1, "Açıklama gerekli"),
  cashAccountId: z.string().optional(),
});

export async function recordManuelGelir(
  _prev: OdemeFormState,
  formData: FormData
): Promise<OdemeFormState> {
  const user = await requireAdminOrReception();
  const raw = {
    amount: formData.get("amount") as string,
    currency: formData.get("currency") as string,
    method: formData.get("method") as string,
    description: formData.get("description") as string,
    cashAccountId: formData.get("cashAccountId") as string || undefined,
  };
  const parsed = manuelGelirSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.cashAccountId) {
    const cash = await prepareCashEntry(parsed.data.cashAccountId, parsed.data.amount, parsed.data.currency);
    if ("error" in cash) return { error: cash.error };
  }

  const payment = await prisma.payment.create({
    data: {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      method: parsed.data.method,
      direction: "INCOMING",
      description: parsed.data.description,
      recordedById: user.userId,
    },
  });

  if (parsed.data.cashAccountId) {
    await updateCashAccount(
      parsed.data.cashAccountId,
      parsed.data.amount,
      parsed.data.currency,
      "INCOME",
      payment.id,
      null,
      user.userId,
      parsed.data.description
    );
  }

  revalidatePath("/dashboard/kasa");
  return {};
}
