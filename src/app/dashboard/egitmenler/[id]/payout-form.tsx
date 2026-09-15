"use client";

import { useActionState } from "react";
import { recordInstructorPayout } from "@/app/actions/instructors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS } from "@/lib/constants";
import { toast } from "sonner";
import { useEffect } from "react";
import type { CashAccount } from "@/generated/prisma/client";

import { formatCurrency } from "@/lib/currency";
interface PayoutFormProps {
  instructorId: string;
  currencies: string[];
  cashAccounts: CashAccount[];
}

export function PayoutForm({ instructorId, currencies, cashAccounts }: PayoutFormProps) {
  const [state, formAction, isPending] = useActionState(recordInstructorPayout, {});

  useEffect(() => {
    if (state && !state.error && Object.keys(state).length === 0) {
      // success — no error
    }
  }, [state]);

  return (
    <Card className="border-warning/30 bg-warning/10">
      <CardHeader>
        <CardTitle className="text-base text-warning">Hakediş Ödemesi Yap</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <input type="hidden" name="instructorId" value={instructorId} />
          {state.error && <p className="col-span-full text-sm text-destructive">{state.error}</p>}
          <div className="space-y-1.5">
            <Label>Tutar *</Label>
            <Input name="amount" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-1.5">
            <Label>Para Birimi</Label>
            <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Yöntem</Label>
            <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {cashAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Kasadan Düş</Label>
              <select name="cashAccountId" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                <option value="">Kasa güncellenmesi (yok)</option>
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Bakiye: {formatCurrency(acc.balance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit" disabled={isPending} className="bg-warning hover:bg-warning">
            {isPending ? "..." : "Ödeme Kaydet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
