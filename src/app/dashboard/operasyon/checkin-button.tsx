"use client";

import { useActionState, useState } from "react";
import { checkIn } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CheckInButtonProps {
  reservationId: string;
  purchaseId?: string;
  plannedHours: number;
  className?: string;
}

export function CheckInButton({ reservationId, purchaseId, className }: CheckInButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (prev: { error?: string }, formData: FormData) => {
      const result = await checkIn(prev, formData);
      if (!result.error) {
        setOpen(false);
        toast.success("Check-in yapıldı");
        router.refresh();
      }
      return result;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className={cn("h-12 w-full text-[15px]", className)} />}>
        <LogIn className="size-[17px]" strokeWidth={2.4} />
        Check-in
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Check-in</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="reservationId" value={reservationId} />
          {purchaseId && <input type="hidden" name="purchaseId" value={purchaseId} />}

          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <p className="text-sm text-muted-foreground">Öğrenci suya çıkıyor olarak işaretlenecek. Onaylıyor musun?</p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 px-5">
              {isPending ? "İşleniyor..." : "Check-in yap"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
