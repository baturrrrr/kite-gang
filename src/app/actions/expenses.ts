"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCashAccount } from "./packages";

const expenseSchema = z.object({
  category: z.enum([
    "RENT", "EQUIPMENT_PURCHASE", "EQUIPMENT_REPAIR", "FUEL",
    "STAFF", "FOOD", "MARKETING", "UTILITIES", "INSURANCE", "OTHER"
  ]),
  amount: z.coerce.number().min(0.01, "Tutar zorunlu"),
  currency: z.enum(["EUR", "USD", "TRY"]),
  method: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]),
  description: z.string().min(1, "Açıklama zorunlu"),
  expenseDate: z.string().min(1, "Tarih zorunlu"),
  cashAccountId: z.string().optional(),
});

export type ExpenseFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const user = await requireAdmin();

  const raw = {
    category: formData.get("category") as string,
    amount: formData.get("amount") as string,
    currency: formData.get("currency") as string,
    method: formData.get("method") as string,
    description: formData.get("description") as string,
    expenseDate: formData.get("expenseDate") as string,
    cashAccountId: formData.get("cashAccountId") as string || undefined,
  };

  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Race-condition güvenli bakiye kontrolü: transaction içinde oku ve kontrol et
  if (parsed.data.cashAccountId) {
    const account = await prisma.cashAccount.findUnique({ where: { id: parsed.data.cashAccountId } });
    if (!account) return { error: "Kasa hesabı bulunamadı" };
    if (account.balance < parsed.data.amount) {
      return { error: `Kasa bakiyesi yetersiz. Mevcut: ${account.balance.toFixed(2)} ${account.currency}` };
    }
  }

  const expense = await prisma.expense.create({
    data: {
      category: parsed.data.category,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      method: parsed.data.method,
      description: parsed.data.description,
      expenseDate: new Date(parsed.data.expenseDate),
      recordedById: user.userId,
    },
  });

  if (parsed.data.cashAccountId) {
    await updateCashAccount(
      parsed.data.cashAccountId,
      parsed.data.amount,
      parsed.data.currency,
      "EXPENSE",
      null,
      expense.id,
      user.userId,
      parsed.data.description
    );
  }

  await logAudit({
    userId: user.userId,
    action: "CREATE",
    entity: "Expense",
    entityId: expense.id,
    newValues: parsed.data,
  });

  revalidatePath("/dashboard/kasa");
  return {};
}

const cashAccountSchema = z.object({
  name: z.string().min(1, "Hesap adı zorunlu"),
  accountType: z.enum(["CASH", "BANK"]),
  currency: z.enum(["EUR", "USD", "TRY"]),
  initialBalance: z.coerce.number().min(0).default(0),
});

export async function createCashAccount(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const user = await requireAdmin();

  const raw = {
    name: formData.get("name") as string,
    accountType: formData.get("accountType") as string,
    currency: formData.get("currency") as string,
    initialBalance: formData.get("initialBalance") as string,
  };

  const parsed = cashAccountSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.cashAccount.create({
    data: {
      name: parsed.data.name,
      accountType: parsed.data.accountType,
      currency: parsed.data.currency,
      balance: parsed.data.initialBalance,
    },
  });

  revalidatePath("/dashboard/kasa");
  return {};
}
