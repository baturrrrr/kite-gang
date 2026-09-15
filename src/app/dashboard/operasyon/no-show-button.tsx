"use client";

import { useActionState, useState } from "react";
import { cancelReservation } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NoShowButtonProps {
  reservationId: string;
  studentName: string;
  plannedHours: number;
  isRental: boolean;
  // Sunucunun saat düşeceği paket: öğrencinin saati kalmış en eski aktif paketi
  packageName?: string;
  remainingHours?: number;
}

export function NoShowButton({
  reservationId,
  studentName,
  plannedHours,
  isRental,
  packageName,
  remainingHours,
}: NoShowButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (prev: { error?: string }, formData: FormData) => {
      const result = await cancelReservation(prev, formData);
      if (!result.error) {
        setOpen(false);
        toast.success(`${studentName} gelmedi olarak işaretlendi.`);
        router.refresh();
      }
      return result;
    },
    {}
  );

  const deductedHours = !isRental && packageName && remainingHours ? Math.min(plannedHours, remainingHours) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" />}
      >
        <UserX className="w-4 h-4 mr-2" />
        Gelmedi
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gelmedi — {studentName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="reservationId" value={reservationId} />
          <input type="hidden" name="status" value="NO_SHOW" />

          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`reason-${reservationId}`}>Not</Label>
            <textarea
              id={`reason-${reservationId}`}
              name="reason"
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              placeholder="Haber vermeden gelmedi, telefonla ulaşılamadı..."
            />
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning">
            {isRental
              ? "Ekipman kiralaması olduğu için paket saati düşülmez."
              : deductedHours > 0
                ? `⚠️ Müşterinin "${packageName}" paketinden ${deductedHours} saat düşülecek.`
                : "Müşterinin kullanılabilir paketi yok, saat düşülmeyecek."}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button type="submit" disabled={isPending} className="bg-destructive hover:bg-destructive text-background">
              {isPending ? "İşleniyor..." : "Gelmedi Olarak İşaretle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
