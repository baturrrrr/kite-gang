"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateEquipment, deleteEquipment } from "@/app/actions/equipment";
import { EQUIPMENT_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Equipment = {
  id: string;
  type: string;
  name: string;
  brand: string | null;
  size: string | null;
  quantity: number;
  status: string;
  notes: string | null;
};

export function EditEquipmentDialog({ equipment }: { equipment: Equipment }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const boundUpdate = updateEquipment.bind(null, equipment.id);
  const [state, formAction, isPending] = useActionState(boundUpdate, {});
  const prevPendingRef = useRef(false);

  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      if (!state.error) {
        setEditOpen(false);
        toast.success("Ekipman güncellendi");
        router.refresh();
      }
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error]);

  async function handleDelete() {
    setDeleting(true);
    await deleteEquipment(equipment.id);
    toast.success("Ekipman silindi");
    router.refresh();
    setConfirmDelete(false);
    setDeleting(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground/70 hover:text-foreground/85 hover:bg-muted transition-colors")}>
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Düzenle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Düzenleme dialogu */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ekipmanı Düzenle</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}

            <div className="space-y-1.5">
              <Label>Tip *</Label>
              <select name="type" defaultValue={equipment.type} className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
                {Object.entries(EQUIPMENT_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Marka *</Label>
              <Input id="edit-name" name="name" required defaultValue={equipment.name} placeholder="Cabrinha, North, Duotone..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input name="brand" defaultValue={equipment.brand ?? ""} placeholder="Switchblade, Dice..." />
              </div>
              <div className="space-y-1.5">
                <Label>Boyut</Label>
                <Input name="size" defaultValue={equipment.size ?? ""} placeholder="12m, L, 136cm..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-quantity">Adet *</Label>
                <Input id="edit-quantity" name="quantity" type="number" min={1} defaultValue={equipment.quantity} required />
              </div>
              <div className="space-y-1.5">
                <Label>Notlar</Label>
                <Input name="notes" defaultValue={equipment.notes ?? ""} placeholder="Ekstra bilgi..." />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "..." : "Güncelle"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme onay dialogu */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ekipmanı Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">{equipment.name}</span> ekipmanını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "..." : "Sil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
