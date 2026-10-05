"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { FormSheet, FormSheetActions } from "@/components/ui/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { updatePackage } from "@/app/actions/packages";
import { LESSON_TYPES, CURRENCIES } from "@/lib/constants";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  lessonType: string;
  totalHours: number;
  price: number;
  currency: string;
  validityDays: number | null;
};

export function EditPackageDialog({
  pkg,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  showTrigger = true,
}: {
  pkg: Pkg;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const boundAction = updatePackage.bind(null, pkg.id);
  const [state, formAction, isPending] = useActionState(boundAction, {});
  const [name, setName] = useState(pkg.name);
  const [lessonType, setLessonType] = useState(pkg.lessonType);
  const [totalHours, setTotalHours] = useState(pkg.totalHours.toString());
  const [validityDays, setValidityDays] = useState(pkg.validityDays?.toString() ?? "");
  const [description, setDescription] = useState(pkg.description ?? "");
  const [price, setPrice] = useState(pkg.price.toFixed(2));
  const [currency, setCurrency] = useState(pkg.currency);
  const prevRef = useRef(false);
  const router = useRouter();
  const rates = useExchangeRates();

  function handleCurrencyChange(next: string) {
    const converted = convertAmount(Number(price) || 0, currency, next, rates);
    if (converted) setPrice(converted.toFixed(2));
    setCurrency(next);
  }

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Paket güncellendi");
        router.refresh();
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      icon={Pencil}
      title="Paketi Düzenle"
      trigger={
        showTrigger ? (
          <button className="text-muted-foreground/70 hover:text-foreground/85 transition-colors" title="Düzenle">
            <Pencil className="w-4 h-4" />
          </button>
        ) : undefined
      }
    >
      <form action={formAction} className="space-y-4">
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.fieldErrors && (
          <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="name">Paket Adı *</Label>
          <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Ders Tipi *</Label>
          <select name="lessonType" className="w-full border rounded-md px-3 py-2 text-sm" required value={lessonType} onChange={(e) => setLessonType(e.target.value)}>
            {Object.entries(LESSON_TYPES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="totalHours">Toplam Saat *</Label>
            <Input id="totalHours" name="totalHours" type="number" step="0.5" min="0.5" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validityDays">Geçerlilik (Gün)</Label>
            <Input id="validityDays" name="validityDays" type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} placeholder="365" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Fiyat *</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Para Birimi</Label>
            <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm" value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Açıklama</Label>
          <Input id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama..." />
        </div>
        <FormSheetActions>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </FormSheetActions>
      </form>
    </FormSheet>
  );
}
