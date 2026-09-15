"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { checkOut } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CheckOutDialogProps {
  lessonId: string;
  studentName: string;
  plannedHours: number;
}

export function CheckOutDialog({ lessonId, studentName, plannedHours }: CheckOutDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(checkOut, {});
  const prevPendingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      if (!state.error) {
        setOpen(false);
        toast.success("Check-out tamamlandı. Ders süresi ve hakediş kaydedildi.");
        router.refresh();
      }
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="w-full bg-success hover:bg-success text-background" />}>
        <LogOut className="w-4 h-4 mr-2" />
        Check-out Yap
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-out — {studentName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="lessonId" value={lessonId} />

          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="actualHours">Gerçekleşen Ders Süresi (Saat) *</Label>
            <Input
              id="actualHours"
              name="actualHours"
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              defaultValue={plannedHours}
              required
            />
            <p className="text-xs text-muted-foreground">Planlanan: {plannedHours} saat</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructorNotes">Ders Notu / Öğrenci İlerlemesi</Label>
            <textarea
              id="instructorNotes"
              name="instructorNotes"
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              placeholder="Body drag yaptı, water start denedi, kite kontrol iyi..."
            />
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning">
            ⚠️ Check-out yapıldığında: ders süresi öğrencinin paket bakiyesinden düşülür ve eğitmenin hakedişi hesaplanır.
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending} className="bg-success hover:bg-success">
              {isPending ? "İşleniyor..." : "Check-out Tamamla"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
