"use client";

import { useActionState, useState, useEffect } from "react";
import { sellPackage } from "@/app/actions/packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CURRENCIES, PAYMENT_METHODS, CURRENCY_SYMBOLS } from "@/lib/constants";
import type { LessonPackage, CashAccount } from "@/generated/prisma/client";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";

interface SellPackageFormProps {
  studentId: string;
  packages: LessonPackage[];
  cashAccounts: CashAccount[];
}

export function SellPackageForm({ studentId, packages, cashAccounts }: SellPackageFormProps) {
  const [state, formAction, isPending] = useActionState(sellPackage, {});
  const [selectedPkg, setSelectedPkg] = useState<LessonPackage | null>(packages[0] ?? null);
  const [currency, setCurrency] = useState(selectedPkg?.currency ?? "TRY");
  const [price, setPrice] = useState(selectedPkg?.price ?? 0);
  const [paidAmount, setPaidAmount] = useState(0);
  const rates = useExchangeRates();

  useEffect(() => {
    if (selectedPkg) {
      setCurrency(selectedPkg.currency);
      setPrice(selectedPkg.price);
    }
  }, [selectedPkg]);

  function handleCurrencyChange(next: string) {
    setPrice(convertAmount(price, currency, next, rates));
    setPaidAmount((prev) => convertAmount(prev, currency, next, rates));
    setCurrency(next);
  }

  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paket Satışı</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />

          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label>Paket *</Label>
            <select
              name="packageId"
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
              required
              onChange={(e) => {
                const pkg = packages.find((p) => p.id === e.target.value);
                setSelectedPkg(pkg ?? null);
              }}
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.totalHours} saat
                </option>
              ))}
            </select>
          </div>

          {selectedPkg && (
            <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm">
              <p className="font-medium text-info">{selectedPkg.name}</p>
              <p className="text-info">
                {selectedPkg.totalHours} saat • ₺{convertAmount(selectedPkg.price, selectedPkg.currency, "TRY", rates).toFixed(2)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice">Satış Fiyatı *</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select
                name="currency"
                className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground/85">İlk Ödeme (Opsiyonel)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paidAmount">Ödenen Tutar</Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  placeholder={`${symbol}0.00`}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ödeme Yöntemi</Label>
                <select name="paymentMethod" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                  {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            {cashAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Kasa Hesabı *</Label>
                <select name="cashAccountId" className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="paymentDescription">Açıklama</Label>
              <Input id="paymentDescription" name="paymentDescription" placeholder="Ödeme açıklaması..." />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "İşleniyor..." : "Paketi Sat"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
