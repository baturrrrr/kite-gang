"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { updateHizmetSablonu, deleteHizmetSablonu } from "@/app/actions/hizmetler";
import { CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Sablon = {
  id: string;
  category: string;
  name: string;
  defaultPrice: number;
  halfDayPrice: number | null;
  fullDayPrice: number | null;
  currency: string;
};

export function EditSablonDialog({ sablon }: { sablon: Sablon }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sablon.name);
  const [price, setPrice] = useState(sablon.defaultPrice.toString());
  const [halfDay, setHalfDay] = useState(sablon.halfDayPrice?.toString() ?? "");
  const [fullDay, setFullDay] = useState(sablon.fullDayPrice?.toString() ?? "");
  const [currency, setCurrency] = useState(sablon.currency);
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
    toast.success("Silindi");
    router.refresh();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Pencil className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hizmeti Düzenle</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="category" value={sablon.category} />

          {state.fieldErrors && (
            <p className="text-sm text-red-500">{Object.values(state.fieldErrors).flat()[0]}</p>
          )}

          <div className="space-y-1.5">
            <Label>Hizmet Adı *</Label>
            <Input name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{sablon.category === "KIRALAMA" ? "Saatlik Fiyat" : "Varsayılan Fiyat"}</Label>
              <Input name="defaultPrice" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {sablon.category === "KIRALAMA" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Yarım Gün Fiyatı</Label>
                <Input name="halfDayPrice" type="number" step="0.01" min="0" value={halfDay} onChange={(e) => setHalfDay(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1.5">
                <Label>Tam Gün Fiyatı</Label>
                <Input name="fullDayPrice" type="number" step="0.01" min="0" value={fullDay} onChange={(e) => setFullDay(e.target.value)} placeholder="—" />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-between">
            <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={handleDelete}>
              Sil
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
