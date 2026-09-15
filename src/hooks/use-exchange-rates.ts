"use client";

import { useEffect, useState } from "react";

export type ExchangeRates = {
  TRY: 1;
  USD: number;
  EUR: number;
  updatedAt: string;
  source: "live" | "saved" | "unavailable";
};

let cache: ExchangeRates | null = null;
let inFlight: Promise<ExchangeRates | null> | null = null;

async function fetchRates(): Promise<ExchangeRates | null> {
  if (!inFlight) {
    inFlight = fetch("/api/kur")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        cache = data;
        return data;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(cache);

  useEffect(() => {
    if (!cache) {
      fetchRates().then((data) => data && setRates(data));
    }
  }, []);

  return rates;
}
