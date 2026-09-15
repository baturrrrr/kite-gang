"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingDown } from "lucide-react";
import { createExpense } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES, CURRENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";

export function NewExpenseForm({ cashAccounts }: { cashAccounts: { id: string; name: string; currency: string; balance: number }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createExpense, {});
  const prevPendingRef = useRef(false);
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
    if (prevPendingRef.current && !isPending) {
      if (!state.error) {
        setOpen(false);
        toast.success("Gider kaydedildi");
        router.refresh();
      }
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" />}>
        <TrendingDown className="w-4 h-4 mr-2" />
        Gider Ekle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gider Girişi</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label>Kategori *</Label>
            <select name="category" className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
              {Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Açıklama *</Label>
            <Input id="description" name="description" required placeholder="Gider detayı..." />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ödeme Yöntemi</Label>
              <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tarih *</Label>
              <Input name="expenseDate" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
            </div>
          </div>

          {cashAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Kasadan Düş</Label>
              <select name="cashAccountId" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                <option value="">Kasa güncellenmesi (yok)</option>
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Bakiye: {acc.balance.toFixed(2)} {acc.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending} className="bg-destructive hover:bg-destructive text-background">
              {isPending ? "Kaydediliyor..." : "Gider Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
