"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createCashAccount } from "@/app/actions/expenses";
import { CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NewAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCashAccount, {});
  const prevPendingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      if (!state.error) {
        setOpen(false);
        toast.success("Hesap oluşturuldu");
        router.refresh();
      }
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="w-4 h-4 mr-1" /> Kasa Ekle
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Yeni Kasa/Banka Hesabı</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <p className="text-sm text-red-500">{state.error}</p>}

          <div className="space-y-1.5">
            <Label>Hesap Adı *</Label>
            <Input name="name" required placeholder="Nakit Kasa EUR" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tip</Label>
              <select name="accountType" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="CASH">Nakit</option>
                <option value="BANK">Banka</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Başlangıç Bakiyesi</Label>
            <Input name="initialBalance" type="number" step="0.01" defaultValue="0" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : "Oluştur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
