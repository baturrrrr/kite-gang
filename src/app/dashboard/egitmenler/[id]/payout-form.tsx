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

interface PayoutFormProps {
  instructorId: string;
  currencies: string[];
}

export function PayoutForm({ instructorId, currencies }: PayoutFormProps) {
  const [state, formAction, isPending] = useActionState(recordInstructorPayout, {});

  useEffect(() => {
    if (state && !state.error && Object.keys(state).length === 0) {
      // success — no error
    }
  }, [state]);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-base text-orange-800">Hakediş Ödemesi Yap</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <input type="hidden" name="instructorId" value={instructorId} />
          {state.error && <p className="col-span-full text-sm text-red-500">{state.error}</p>}
          <div className="space-y-1.5">
            <Label>Tutar *</Label>
            <Input name="amount" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-1.5">
            <Label>Para Birimi</Label>
            <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Yöntem</Label>
            <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={isPending} className="bg-orange-600 hover:bg-orange-700">
            {isPending ? "..." : "Ödeme Kaydet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
