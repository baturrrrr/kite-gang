"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { updateHizmetSablonu, deleteHizmetSablonu } from "@/app/actions/hizmetler";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FiyatRowsEditor, emptyFiyatRow, type FiyatRow } from "./fiyat-rows-editor";

type Sablon = {
  id: string;
  category: string;
  name: string;
  subCategory: string | null;
  requiredPeople: number | null;
  description: string | null;
  onlineVisibility: string;
  validityDays: number | null;
  fiyatlar: { zamanBirimi: string; currency: string; price: number }[];
};

export function EditSablonDialog({
  sablon,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  showTrigger = true,
}: {
  sablon: Sablon;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const [name, setName] = useState(sablon.name);
  const [validityDays, setValidityDays] = useState(sablon.validityDays?.toString() ?? "");
  const [rows, setRows] = useState<FiyatRow[]>(
    sablon.fiyatlar.length > 0
      ? sablon.fiyatlar.map((f) => ({ zamanBirimi: f.zamanBirimi, currency: f.currency, price: f.price.toString() }))
      : [emptyFiyatRow(sablon.category)]
  );
  const boundAction = updateHizmetSablonu.bind(null, sablon.id);
  const [state, formAction, isPending] = useActionState(boundAction, {});
  const prevRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Güncellendi");
        router.refresh();
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  async function handleDelete() {
    await deleteHizmetSablonu(sablon.id);
    toast.success("Pasife alındı");
    router.refresh();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger render={<Button variant="ghost" size="sm" />}>
          <Pencil className="w-3.5 h-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hizmeti Düzenle</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="category" value={sablon.category} />
          <input type="hidden" name="fiyatlarJson" value={JSON.stringify(rows)} />

          {state.fieldErrors && (
            <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
          )}

          <div className="space-y-1.5">
            <Label>Hizmet Adı *</Label>
            <Input name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Input name="subCategory" defaultValue={sablon.subCategory ?? ""} placeholder="Örn: Kitesurf" />
            </div>
            <div className="space-y-1.5">
              <Label>Gerekli Kişi Sayısı</Label>
              <Input name="requiredPeople" type="number" min="1" defaultValue={sablon.requiredPeople ?? ""} placeholder="Örn: 1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input name="description" defaultValue={sablon.description ?? ""} placeholder="Kısa açıklama (opsiyonel)" />
          </div>

          <div className="space-y-1.5">
            <Label>Online Uygunluk</Label>
            <select
              name="onlineVisibility"
              defaultValue={sablon.onlineVisibility}
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
            >
              <option value="LISTED">Online listelenir</option>
              <option value="PARTNER_ONLY">Yalnızca Partner Paneli</option>
              <option value="HIDDEN">Gizli</option>
            </select>
          </div>

          {sablon.category === "UYELIK" && (
            <div className="space-y-1.5">
              <Label>Geçerlilik (gün)</Label>
              <Input
                name="validityDays"
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                placeholder="Örn: 365"
              />
            </div>
          )}

          <FiyatRowsEditor rows={rows} onChange={setRows} category={sablon.category} />

          <div className="flex gap-2 justify-between">
            <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
              Pasife Al
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "..." : "Kaydet"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
