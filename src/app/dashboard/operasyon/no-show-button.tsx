"use client";

import { useActionState, useState } from "react";
import { cancelReservation } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, UserX } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NoShowButtonProps {
  reservationId: string;
  studentName: string;
  plannedHours: number;
  isRental: boolean;
  // Sunucunun saat düşeceği paket: öğrencinin saati kalmış en eski aktif paketi
  packageName?: string;
  remainingHours?: number;
  className?: string;
}

export function NoShowButton({
  reservationId,
  studentName,
  plannedHours,
  isRental,
  packageName,
  remainingHours,
  className,
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
        render={
          <Button
            variant="outline"
            className={cn(
              "h-12 w-full border-destructive/40 bg-transparent text-[15px] text-destructive hover:bg-destructive/10 hover:text-destructive",
              className
            )}
          />
        }
      >
        <UserX className="size-[17px]" />
        Gelmedi
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {/* Müşteriler çoğunlukla yabancı: Türkçe büyük harf kuralı "SMİTH" yazmasın diye ad büyütülmez */}
          <DialogTitle className="text-2xl font-extrabold">
            Gelmedi — <span className="normal-case">{studentName}</span>
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="reservationId" value={reservationId} />
          <input type="hidden" name="status" value="NO_SHOW" />

          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`reason-${reservationId}`}>Not</Label>
            <textarea
              id={`reason-${reservationId}`}
              name="reason"
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
              placeholder="Haber vermeden gelmedi, telefonla ulaşılamadı..."
            />
          </div>

          <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <Info className="size-4 shrink-0" />
            {isRental
              ? "Ekipman kiralaması olduğu için paket saati düşülmez."
              : deductedHours > 0
                ? `Müşterinin "${packageName}" paketinden ${deductedHours} saat düşülecek.`
                : "Müşterinin kullanılabilir paketi yok, saat düşülmeyecek."}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 bg-destructive px-5 text-background hover:bg-destructive/90">
              {isPending ? "İşleniyor..." : "Gelmedi olarak işaretle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
