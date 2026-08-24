"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordPayment } from "@/app/actions/packages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS, CURRENCY_SYMBOLS } from "@/lib/constants";
import type { CashAccount } from "@/generated/prisma/client";

interface PaymentDialogProps {
  purchaseId: string;
  studentId: string;
  owedAmount: number;
  currency: string;
  packageName: string;
  cashAccounts: CashAccount[];
}

export function PaymentDialog({
  purchaseId,
  studentId,
  owedAmount,
  currency,
  packageName,
  cashAccounts,
}: PaymentDialogProps) {
  const [state, formAction, isPending] = useActionState(recordPayment, {});
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!state.error && Object.keys(state).length > 0) {
      closeRef.current?.click();
    }
  }, [state]);

  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;

  return (
    <Dialog>
      <DialogTrigger className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors">
        Ödeme Al
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödeme Kaydet</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-2">{packageName}</p>

        <form action={formAction} className="space-y-4 mt-1">
          <input type="hidden" name="purchaseId" value={purchaseId} />
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="currency" value={currency} />

          {state.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">Tutar ({symbol}) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={owedAmount.toFixed(2)}
              required
            />
            <p className="text-xs text-gray-400">Kalan borç: {symbol}{owedAmount.toFixed(2)}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Ödeme Yöntemi *</Label>
            <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {cashAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Kasa Hesabı</Label>
              <select name="cashAccountId" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Kasa güncellenmesin</option>
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description">Açıklama</Label>
            <Input id="description" name="description" placeholder="Ör: Nakit ödeme alındı" />
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
