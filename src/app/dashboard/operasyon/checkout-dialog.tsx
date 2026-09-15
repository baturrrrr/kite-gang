"use client";

import { useActionState, useState } from "react";
import { checkOut } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CheckOutDialogProps {
  lessonId: string;
  studentName: string;
  plannedHours: number;
}

export function CheckOutDialog({ lessonId, studentName, plannedHours }: CheckOutDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (prev: { error?: string }, formData: FormData) => {
      const result = await checkOut(prev, formData);
      if (!result.error) {
        setOpen(false);
        toast.success("Check-out tamamlandı. Ders süresi ve hakediş kaydedildi.");
        router.refresh();
      }
      return result;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-12 w-full text-[15px]" />}>
        <LogOut className="size-[17px]" strokeWidth={2.4} />
        Check-out yap
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {/* Müşteriler çoğunlukla yabancı: Türkçe büyük harf kuralı "SMİTH" yazmasın diye ad büyütülmez */}
          <DialogTitle className="text-2xl font-extrabold">
            <span lang="en">Check-out</span> — <span className="normal-case">{studentName}</span>
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="lessonId" value={lessonId} />

          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="actualHours">Gerçekleşen ders süresi (saat)</Label>
            <Input
              id="actualHours"
              name="actualHours"
              type="number"
              inputMode="decimal"
              step="0.25"
              min="0.25"
              max="24"
              defaultValue={plannedHours}
              required
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">Planlanan: {plannedHours} saat</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructorNotes">Ders notu / öğrenci ilerlemesi</Label>
            <textarea
              id="instructorNotes"
              name="instructorNotes"
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
              placeholder="Body drag yaptı, water start denedi, kite kontrolü iyi..."
            />
          </div>

          <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <Info className="size-4 shrink-0" />
            Check-out yapıldığında ders süresi öğrencinin paket bakiyesinden düşülür ve eğitmenin hakedişi hesaplanır.
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 px-5">
              {isPending ? "İşleniyor..." : "Check-out tamamla"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
