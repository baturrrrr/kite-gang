"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { FormSheet, FormSheetActions } from "@/components/ui/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Wrench } from "lucide-react";
import { createEquipment } from "@/app/actions/equipment";
import { EQUIPMENT_TYPES } from "@/lib/constants";
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
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      icon={Wrench}
      title="Yeni Ekipman"
      trigger={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ekipman Ekle
        </Button>
      }
    >
      <form action={formAction} className="space-y-4">
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="space-y-1.5">
          <Label>Tip *</Label>
          <select name="type" className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
            {Object.entries(EQUIPMENT_TYPES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Marka *</Label>
          <Input id="name" name="name" required placeholder="Cabrinha, North, Duotone..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input name="brand" placeholder="Switchblade, Dice..." />
          </div>
          <div className="space-y-1.5">
            <Label>Boyut</Label>
            <Input name="size" placeholder="12m, L, 136cm..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Adet *</Label>
            <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Input name="notes" placeholder="Ekstra bilgi..." />
          </div>
        </div>

        <FormSheetActions>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "..." : "Ekle"}
          </Button>
        </FormSheetActions>
      </form>
    </FormSheet>
  );
}
