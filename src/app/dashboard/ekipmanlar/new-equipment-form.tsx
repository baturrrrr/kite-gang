"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createEquipment } from "@/app/actions/equipment";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NewEquipmentForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createEquipment, {});
  const prevPendingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      if (!state.error) {
        setOpen(false);
        toast.success("Ekipman eklendi");
        router.refresh();
      }
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4 mr-2" />
        Ekipman Ekle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Ekipman</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <p className="text-sm text-red-500">{state.error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tip *</Label>
              <select name="type" className="w-full border rounded-md px-3 py-2 text-sm bg-white" required>
                {Object.entries(EQUIPMENT_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <select name="status" className="w-full border rounded-md px-3 py-2 text-sm bg-white" defaultValue="AVAILABLE">
                {Object.entries(EQUIPMENT_STATUSES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Ad *</Label>
            <Input id="name" name="name" required placeholder="12m Cabrinha Switchblade" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marka</Label>
              <Input name="brand" placeholder="Cabrinha, North..." />
            </div>
            <div className="space-y-1.5">
              <Label>Boyut</Label>
              <Input name="size" placeholder="12m, L, 136cm..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Input name="notes" placeholder="Ekstra bilgi..." />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : "Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
