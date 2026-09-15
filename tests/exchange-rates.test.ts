/**
 * Kur servisi yanıt vermediğinde 0 kurla yanlış TL tutarı üretilmemeli
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { canConvert } from "@/lib/currency";

const { settings } = vi.hoisted(() => ({ settings: new Map<string, string>() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) =>
        settings.has(where.key) ? { key: where.key, value: settings.get(where.key) } : null
      ),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { value: string } }) => {
        settings.set(where.key, create.value);
      }),
    },
  },
}));

beforeEach(() => {
  settings.clear();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("getExchangeRates", () => {
  it("canlı kuru döndürür ve kaydeder", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ rates: { TRY: 40 } }) })));
    const { getExchangeRates } = await import("@/lib/exchange-rates");

    const rates = await getExchangeRates();

    expect(rates.source).toBe("live");
    expect(rates.EUR).toBe(40);
    expect(settings.has("exchange_rates")).toBe(true);
  });

  it("servis yanıt vermezse son kaydedilen kura düşer", async () => {
    settings.set("exchange_rates", JSON.stringify({ USD: 38, EUR: 41, updatedAt: "2026-09-01T10:00:00.000Z" }));
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { getExchangeRates } = await import("@/lib/exchange-rates");

    const rates = await getExchangeRates();

    expect(rates.source).toBe("saved");
    expect(rates.EUR).toBe(41);
    expect(canConvert("EUR", "TRY", rates)).toBe(true);
  });

  it("hiç kur yoksa çeviriye izin vermez", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { getExchangeRates } = await import("@/lib/exchange-rates");

    const rates = await getExchangeRates();

    expect(rates.source).toBe("unavailable");
    expect(canConvert("EUR", "TRY", rates)).toBe(false);
    expect(canConvert("TRY", "TRY", rates)).toBe(true);
  });
});
