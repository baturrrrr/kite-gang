"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { recordMusteriOdeme } from "@/app/actions/odemeler";
import { CURRENCIES, PAYMENT_METHODS, CURRENCY_SYMBOLS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";
import type { CashAccount } from "@/generated/prisma/client";

type HizmetOption = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  instructorEarning: number | null;
  instructorName: string | null;
};

function formatMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function OdemeDialog({
  studentId,
  hizmetler = [],
  cashAccounts = [],
}: {
  studentId: string;
  hizmetler?: HizmetOption[];
  cashAccounts?: CashAccount[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(recordMusteriOdeme, {});
  const prevRef = useRef(false);
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [hizmetId, setHizmetId] = useState("");
  const rates = useExchangeRates();

  function handleCurrencyChange(next: string) {
    const converted = convertAmount(Number(amount) || 0, currency, next, rates);
    if (converted) setAmount(converted.toFixed(2));
    setCurrency(next);
  }

  function handleHizmetChange(id: string) {
    setHizmetId(id);
    const h = hizmetler.find((x) => x.id === id);
    if (h) {
      setAmount(h.amount.toFixed(2));
      setCurrency(h.currency);
    }
  }

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Ödeme kaydedildi");
        router.refresh();
        setAmount("");
        setHizmetId("");
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CreditCard className="w-4 h-4 mr-1" /> Ödeme Al
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Müşteri Ödemesi</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="hizmetId" value={hizmetId} />

          {state.fieldErrors && (
            <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
          )}

          {hizmetler.length > 0 && (
            <div className="space-y-1.5">
              <Label>Hangi Ders / Hizmet İçin</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                value={hizmetId}
                onChange={(e) => handleHizmetChange(e.target.value)}
              >
                <option value="">Genel / belirtilmeden</option>
                {hizmetler.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title} — {formatMoney(h.amount, h.currency)}
                    {h.instructorName ? ` (${h.instructorName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Tutar *</Label>
              <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-card" value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ödeme Yöntemi *</Label>
            <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
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

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input name="description" placeholder="Hangi hizmet için..." />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Ödeme Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
