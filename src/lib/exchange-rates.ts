import "server-only";
import { prisma } from "@/lib/prisma";

// live: az önce servisten alındı · saved: servis yanıt vermedi, son kaydedilen kur
// kullanılıyor · unavailable: hiç kur yok, yabancı para birimi TL'ye çevrilemez.
export type RatesSource = "live" | "saved" | "unavailable";
export type ExchangeRates = { TRY: 1; USD: number; EUR: number; updatedAt: string; source: RatesSource };

const SETTING_KEY = "exchange_rates";
const CACHE_MS = 60 * 60 * 1000;
// Servis yanıt vermediğinde bir saat beklemek yerine kısa aralıklarla yeniden denenir.
const RETRY_MS = 5 * 60 * 1000;

let cache: ExchangeRates | null = null;
let cacheAt = 0;

async function fetchRate(from: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=TRY`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates?.TRY ?? null;
  } catch {
    return null;
  }
}

async function loadSavedRates(): Promise<ExchangeRates | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return null;
    const data = JSON.parse(row.value);
    if (!data?.USD || !data?.EUR) return null;
    return { TRY: 1, USD: data.USD, EUR: data.EUR, updatedAt: data.updatedAt, source: "saved" };
  } catch {
    return null;
  }
}

async function saveRates(rates: ExchangeRates) {
  const value = JSON.stringify({ USD: rates.USD, EUR: rates.EUR, updatedAt: rates.updatedAt });
  try {
    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value },
    });
  } catch {
    // Kaydedilemese de canlı kur bu istekte kullanılabilir.
  }
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cache && now - cacheAt < (cache.source === "live" ? CACHE_MS : RETRY_MS)) return cache;

  const [usd, eur] = await Promise.all([fetchRate("USD"), fetchRate("EUR")]);

  let result: ExchangeRates;
  if (usd !== null && eur !== null) {
    result = { TRY: 1, USD: usd, EUR: eur, updatedAt: new Date().toISOString(), source: "live" };
    await saveRates(result);
  } else {
    // 0 kurla sessizce yanlış TL tutarı göstermek yerine bilinen son kura düşülür.
    const lastKnown = cache && cache.source !== "unavailable" ? { ...cache, source: "saved" as const } : await loadSavedRates();
    result = lastKnown ?? { TRY: 1, USD: 0, EUR: 0, updatedAt: new Date().toISOString(), source: "unavailable" };
  }

  cache = result;
  cacheAt = now;
  return result;
}
