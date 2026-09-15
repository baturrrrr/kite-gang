export type Rates = { TRY: number; USD: number; EUR: number };

export function convertAmount(amount: number, from: string, to: string, rates: Rates | null): number {
  if (!rates || from === to || !amount) return amount;
  const fromRate = from === "TRY" ? 1 : rates[from as "USD" | "EUR"];
  const toRate = to === "TRY" ? 1 : rates[to as "USD" | "EUR"];
  if (!fromRate || !toRate) return amount;
  return (amount * fromRate) / toRate;
}

// convertAmount kur yoksa tutarı çevirmeden döndürür; kasaya yazılacak tutarlarda
// bunun yerine önce bu kontrol yapılmalı.
export function canConvert(from: string, to: string, rates: Rates | null): boolean {
  if (from === to) return true;
  if (!rates) return false;
  const fromRate = from === "TRY" ? 1 : rates[from as "USD" | "EUR"];
  const toRate = to === "TRY" ? 1 : rates[to as "USD" | "EUR"];
  return Boolean(fromRate && toRate);
}

export function toTRY(amount: number, currency: string, rates: Rates | null): number {
  return convertAmount(amount, currency, "TRY", rates);
}

const trNumber = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ₺842.454,00 · −₺3.000,00 (eksi işareti sembolün önünde)
export function formatTL(amount: number): string {
  return `${amount < 0 ? "−" : ""}₺${trNumber.format(Math.abs(amount))}`;
}

// Uygulama genelinde tutarlar tutarlılık için TL'ye çevrilerek gösterilir;
// orijinal işlem para birimi veritabanında korunur, sadece ekran gösterimi TL'dir.
export function formatTRY(amount: number, currency: string, rates: Rates | null): string {
  return formatTL(toTRY(amount, currency, rates));
}
