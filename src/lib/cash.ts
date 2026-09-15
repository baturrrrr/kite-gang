import "server-only";
import { prisma } from "@/lib/prisma";
import { convertAmount, canConvert } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

// Kasa yardımcıları bilerek "use server" dosyası dışında: orada export edilseydi her biri
// yetki kontrolü olmadan istemciden çağrılabilen bir server action uç noktası olurdu.
// Yetki kontrolü, bunları çağıran action'larda yapılır.

// Tutarı, hedef kasa hesabının kendi para birimine çevirir. Hesap ile işlem
// para birimi aynıysa dönüşüm yapılmaz — farklıysa güncel kur ile çevrilir
// (örn. EUR olarak alınan bir ödeme TRY kasaya TRY olarak yansır).
export async function convertForAccount(
  amount: number,
  currency: string,
  account: { currency: string }
): Promise<{ amount: number; currency: string }> {
  if (currency === account.currency) return { amount, currency };
  const rates = await getExchangeRates();
  // Kur yoksa convertAmount tutarı çevirmeden döndürür (100 EUR → ₺100); kasaya asla böyle yazılmamalı.
  if (!canConvert(currency, account.currency, rates)) {
    throw new Error(
      "Kur bilgisi alınamadığı için farklı para birimindeki tutar kasaya işlenemedi. Aynı para biriminde bir kasa seçin veya biraz sonra tekrar deneyin."
    );
  }
  const converted = convertAmount(amount, currency, account.currency, rates);
  return { amount: converted, currency: account.currency };
}

// Ödeme/gider kaydı oluşturulmadan önce çağrılır: kayıt oluşup kasa güncellemesi
// sonradan başarısız olursa ödeme ile kasa bakiyesi birbirini tutmaz.
export async function prepareCashEntry(accountId: string, amount: number, currency: string) {
  const account = await prisma.cashAccount.findUnique({ where: { id: accountId } });
  if (!account) return { error: "Kasa hesabı bulunamadı" };
  try {
    const converted = await convertForAccount(amount, currency, account);
    return { account, converted };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kasa işlemi hazırlanamadı" };
  }
}

export async function updateCashAccount(
  accountId: string,
  amount: number,
  currency: string,
  entryType: "INCOME" | "EXPENSE",
  paymentId: string | null,
  expenseId: string | null,
  userId: string,
  description: string,
  payoutId: string | null = null
) {
  const account = await prisma.cashAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  const converted = await convertForAccount(amount, currency, account);
  const isConverted = converted.currency !== currency;
  const entryDescription = isConverted
    ? `${description} (${amount.toFixed(2)} ${currency} → ${converted.amount.toFixed(2)} ${converted.currency})`
    : description;

  await prisma.$transaction([
    prisma.cashAccount.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: entryType === "INCOME" ? converted.amount : -converted.amount,
        },
      },
    }),
    prisma.cashRegisterEntry.create({
      data: {
        accountId,
        entryType,
        amount: converted.amount,
        currency: converted.currency,
        description: entryDescription,
        paymentId,
        expenseId,
        payoutId,
        recordedById: userId,
      },
    }),
  ]);
}
