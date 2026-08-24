"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { recordMusteriOdeme } from "@/app/actions/odemeler";
import { CURRENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function OdemeDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(recordMusteriOdeme, {});
  const prevRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Ödeme kaydedildi");
        router.refresh();
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

          {state.fieldErrors && (
            <p className="text-sm text-red-500">{Object.values(state.fieldErrors).flat()[0]}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Tutar *</Label>
              <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ödeme Yöntemi *</Label>
            <select name="method" className="w-full border rounded-md px-3 py-2 text-sm bg-white" required>
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

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
