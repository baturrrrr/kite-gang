"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { checkIn } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
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
      <DialogTrigger render={<Button size="sm" className="w-full bg-warning hover:bg-warning text-background" />}>
        <LogIn className="w-4 h-4 mr-2" />
        Check-in Yap
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in Onayı</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="reservationId" value={reservationId} />
          {purchaseId && <input type="hidden" name="purchaseId" value={purchaseId} />}

          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>
          )}

          <p className="text-sm text-muted-foreground">Bu rezervasyon için check-in yapmak istediğinize emin misiniz?</p>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending} className="bg-warning hover:bg-warning">
              <CheckCircle className="w-4 h-4 mr-2" />
              {isPending ? "İşleniyor..." : "Onayla"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
