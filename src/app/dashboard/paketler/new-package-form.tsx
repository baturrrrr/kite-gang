"use client";

import { useState, useActionState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createPackage } from "@/app/actions/packages";
import { LESSON_TYPES, CURRENCIES } from "@/lib/constants";

export function NewPackageForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createPackage, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4 mr-2" />
        Yeni Paket
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Ders Paketi</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Paket Adı *</Label>
            <Input id="name" name="name" required placeholder="Başlangıç Paketi 6 Saat" />
          </div>
          <div className="space-y-1.5">
            <Label>Ders Tipi *</Label>
            <select name="lessonType" className="w-full border rounded-md px-3 py-2 text-sm" required>
              {Object.entries(LESSON_TYPES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="totalHours">Toplam Saat *</Label>
              <Input id="totalHours" name="totalHours" type="number" step="0.5" min="0.5" defaultValue="6" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validityDays">Geçerlilik (Gün)</Label>
              <Input id="validityDays" name="validityDays" type="number" min="1" placeholder="365" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Fiyat *</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select name="currency" className="w-full border rounded-md px-3 py-2 text-sm" defaultValue="EUR">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Açıklama</Label>
            <Input id="description" name="description" placeholder="Kısa açıklama..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
