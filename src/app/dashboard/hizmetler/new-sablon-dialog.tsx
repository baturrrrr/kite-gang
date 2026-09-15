"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createHizmetSablonu } from "@/app/actions/hizmetler";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FiyatRowsEditor, emptyFiyatRow, type FiyatRow } from "./fiyat-rows-editor";

export function NewSablonDialog({
  category,
  categoryLabel,
  triggerLabel,
  variant = "outline",
}: {
  category: string;
  categoryLabel: string;
  triggerLabel?: string;
  variant?: "outline" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createHizmetSablonu, {});
  const [rows, setRows] = useState<FiyatRow[]>([emptyFiyatRow(category)]);
  const prevRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Hizmet eklendi");
        router.refresh();
        setRows([emptyFiyatRow(category)]);
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>
        <Plus className="w-3.5 h-3.5 mr-1" /> {triggerLabel ?? "Ekle"}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{categoryLabel} — Yeni Hizmet</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="fiyatlarJson" value={JSON.stringify(rows)} />

          {state.fieldErrors && (
            <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
          )}

          <div className="space-y-1.5">
            <Label>Hizmet Adı *</Label>
            <Input name="name" required placeholder="Örn: Kitesurf Özel Ders" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Input name="subCategory" placeholder="Örn: Kitesurf" />
            </div>
            <div className="space-y-1.5">
              <Label>Gerekli Kişi Sayısı</Label>
              <Input name="requiredPeople" type="number" min="1" placeholder="Örn: 1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input name="description" placeholder="Kısa açıklama (opsiyonel)" />
          </div>

          <div className="space-y-1.5">
            <Label>Online Uygunluk</Label>
            <select
              name="onlineVisibility"
              defaultValue="LISTED"
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
            >
              <option value="LISTED">Online listelenir</option>
              <option value="PARTNER_ONLY">Yalnızca Partner Paneli</option>
              <option value="HIDDEN">Gizli</option>
            </select>
          </div>

          {category === "UYELIK" && (
            <div className="space-y-1.5">
              <Label>Geçerlilik (gün)</Label>
              <Input name="validityDays" type="number" min="1" placeholder="Örn: 365" />
            </div>
          )}

          <FiyatRowsEditor rows={rows} onChange={setRows} category={category} />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "..." : "Kaydet"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
