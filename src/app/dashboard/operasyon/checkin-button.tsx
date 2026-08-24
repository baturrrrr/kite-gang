"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { checkIn } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CheckInButtonProps {
  reservationId: string;
  purchaseId?: string;
  plannedHours: number;
}

export function CheckInButton({ reservationId, purchaseId, plannedHours }: CheckInButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(checkIn, {});
  const prevPendingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      if (!state.error) {
        setOpen(false);
        toast.success("Check-in başarıyla yapıldı!");
        router.refresh();
      }
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" />}>
        <LogIn className="w-4 h-4 mr-2" />
        Check-in Yap
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in — Ekipman Bilgileri</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="reservationId" value={reservationId} />
          {purchaseId && <input type="hidden" name="purchaseId" value={purchaseId} />}

          {state.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kiteSize">Uçurtma Boyutu</Label>
              <Input id="kiteSize" name="kiteSize" placeholder="12m, 9m..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="boardType">Tahta Tipi</Label>
              <Input id="boardType" name="boardType" placeholder="Twin tip, Directional..." />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="harness" className="w-4 h-4 rounded" />
              <span className="text-sm">Trapez</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="wetsuit" className="w-4 h-4 rounded" />
              <span className="text-sm">Wetsuit</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="equipmentNotes">Ekipman Notları</Label>
            <Input id="equipmentNotes" name="equipmentNotes" placeholder="Bar numarası, özel notlar..." />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending} className="bg-yellow-500 hover:bg-yellow-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              {isPending ? "İşleniyor..." : "Check-in Yap"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
