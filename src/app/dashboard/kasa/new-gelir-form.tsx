"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { FormSheet, FormSheetActions } from "@/components/ui/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { recordManuelGelir } from "@/app/actions/odemeler";
import { CURRENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";

type CashAccountOption = { id: string; name: string; currency: string; balance: number };

export function NewGelirForm({ cashAccounts = [] }: { cashAccounts?: CashAccountOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(recordManuelGelir, {});
  const prevRef = useRef(false);
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const rates = useExchangeRates();

  function handleCurrencyChange(next: string) {
    const converted = convertAmount(Number(amount) || 0, currency, next, rates);
    if (converted) setAmount(converted.toFixed(2));
    setCurrency(next);
  }

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Gelir kaydedildi");
        router.refresh();
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      icon={TrendingUp}
      title="Manuel Gelir Girişi"
      trigger={
        <Button variant="outline" className="border-success/30 text-success hover:bg-success/10">
          <TrendingUp className="w-4 h-4 mr-2" />
          Gelir Ekle
        </Button>
      }
    >
      <form action={formAction} className="space-y-4">
        {state.fieldErrors && (
          <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}

        <div className="space-y-1.5">
          <Label>Açıklama / Başlık *</Label>
          <Input name="description" required placeholder="Örn: Komisyon, Diğer gelir..." />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Tutar *</Label>
            <Input name="amount" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Para Birimi</Label>
            <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-card" value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Ödeme Yöntemi</Label>
          <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
            {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
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

        <FormSheetActions>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
          <Button type="submit" disabled={isPending} className="bg-success hover:bg-success text-background">
            {isPending ? "Kaydediliyor..." : "Gelir Kaydet"}
          </Button>
        </FormSheetActions>
      </form>
    </FormSheet>
  );
}
