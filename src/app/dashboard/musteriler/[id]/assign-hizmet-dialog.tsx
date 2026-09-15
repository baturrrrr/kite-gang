"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { assignHizmet } from "@/app/actions/hizmetler";
import { CURRENCIES, PAYMENT_METHODS, ZAMAN_BIRIMLERI, HIZMET_CATEGORIES, EQUIPMENT_TYPES } from "@/lib/constants";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Fiyat = { zamanBirimi: string; currency: string; price: number };
type Sablon = {
  id: string;
  category: string;
  name: string;
  fiyatlar: Fiyat[];
};
type Instructor = { id: string; hourlyRate: number | null; hourlyRateCurrency: string; user: { name: string } };
type EquipmentItem = { id: string; type: string; name: string; size: string | null };

const CAT_LABELS: Record<string, string> = HIZMET_CATEGORIES;

function defaultAt() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function AssignHizmetDialog({
  studentId,
  sablonlar,
  instructors,
  equipment,
}: {
  studentId: string;
  sablonlar: Sablon[];
  instructors: Instructor[];
  equipment: EquipmentItem[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(assignHizmet, {});
  const prevRef = useRef(false);
  const router = useRouter();

  const [selectedSablon, setSelectedSablon] = useState<Sablon | null>(null);
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("TRY");
  const [quantity, setQuantity] = useState("1");
  const [scheduledAt, setScheduledAt] = useState(defaultAt);
  const [instructorId, setInstructorId] = useState("");
  const [instructorEarning, setInstructorEarning] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [activeFiyatIdx, setActiveFiyatIdx] = useState(0);
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
        toast.success("Hizmet eklendi");
        router.refresh();
        setSelectedSablon(null);
        setPrice("0");
        setQuantity("1");
        setInstructorId("");
        setInstructorEarning("");
        setEquipmentId("");
        setActiveFiyatIdx(0);
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  function pickSablon(s: Sablon) {
    setSelectedSablon(s);
    const first = s.fiyatlar[0];
    setPrice((first?.price ?? 0).toFixed(2));
    setCurrency(first?.currency ?? "TRY");
    setQuantity("1");
    setInstructorId("");
    setInstructorEarning("");
    setEquipmentId("");
    setActiveFiyatIdx(0);
  }

  function pickFiyat(idx: number, qty?: string) {
    if (!selectedSablon) return;
    const f = selectedSablon.fiyatlar[idx];
    if (!f) return;
    setActiveFiyatIdx(idx);
    const q = Number(qty ?? quantity) || 1;
    setPrice((f.price * (selectedSablon.category === "URUN" ? q : 1)).toFixed(2));
    setCurrency(f.currency);
  }

  function handleQuantityChange(value: string) {
    setQuantity(value);
    pickFiyat(activeFiyatIdx, value);
  }

  function handleInstructorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setInstructorId(id);
    if (id) {
      const inst = instructors.find((i) => i.id === id);
      if (inst?.hourlyRate) setInstructorEarning(inst.hourlyRate.toString());
    } else {
      setInstructorEarning("");
    }
  }

  const grouped = {
    EGITIM:   sablonlar.filter((s) => s.category === "EGITIM"),
    KIRALAMA: sablonlar.filter((s) => s.category === "KIRALAMA"),
    URUN:     sablonlar.filter((s) => s.category === "URUN"),
    UYELIK:   sablonlar.filter((s) => s.category === "UYELIK"),
    ETKINLIK: sablonlar.filter((s) => s.category === "ETKINLIK"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="w-4 h-4 mr-1" /> Hizmet Ekle
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hizmet Ekle</DialogTitle>
        </DialogHeader>

        {state.error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>}
        {state.fieldErrors && (
          <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}

        {/* Service picker */}
        {!selectedSablon ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Hizmet türü seçin:</p>
            {(Object.entries(grouped) as [string, Sablon[]][]).map(([cat, items]) =>
              items.length > 0 ? (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-1.5">
                    {CAT_LABELS[cat]}
                  </p>
                  <div className="space-y-1">
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pickSablon(s)}
                        className="w-full flex justify-between items-center px-3 py-2.5 rounded-lg border border-border hover:border-info/60 hover:bg-info/10 transition-all text-left"
                      >
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        {s.fiyatlar[0] && (
                          <span className="text-sm text-muted-foreground">{s.fiyatlar[0].currency} {s.fiyatlar[0].price.toFixed(2)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="sablonId" value={selectedSablon.id} />
            <input type="hidden" name="category" value={selectedSablon.category} />
            <input type="hidden" name="title" value={selectedSablon.name} />

            {/* Selected service chip + back */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSablon(null)}
                className="text-xs text-info hover:underline"
              >
                ← Değiştir
              </button>
              <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-full">
                {CAT_LABELS[selectedSablon.category]} — {selectedSablon.name}
              </span>
            </div>

            {/* Fiyat satırı seçici — birden fazla zaman birimi/döviz varsa */}
            {selectedSablon.fiyatlar.length > 1 && (
              <div className="space-y-1.5">
                <Label>Fiyat Seçimi</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedSablon.fiyatlar.map((f, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => pickFiyat(idx)}
                      className={`py-2 px-3 text-sm rounded-md border transition-all ${
                        activeFiyatIdx === idx
                          ? "border-info/60 bg-info/10 text-info font-medium"
                          : "border-border hover:border-border"
                      }`}
                    >
                      <div>{ZAMAN_BIRIMLERI[f.zamanBirimi as keyof typeof ZAMAN_BIRIMLERI]}</div>
                      <div className="text-xs text-muted-foreground">{f.currency} {f.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Adet — sadece Satılabilir Ürün */}
            {selectedSablon.category === "URUN" && (
              <div className="space-y-1.5">
                <Label>Adet</Label>
                <Input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
              </div>
            )}

            {/* Equipment — only for KIRALAMA */}
            {selectedSablon.category === "KIRALAMA" && (
              <div className="space-y-1.5">
                <Label>Ekipman</Label>
                <select
                  name="equipmentId"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                >
                  <option value="">Belirtilmedi</option>
                  {equipment.map((e) => (
                    <option key={e.id} value={e.id}>
                      {EQUIPMENT_TYPES[e.type as keyof typeof EQUIPMENT_TYPES] ?? e.type} — {e.name}
                      {e.size ? ` (${e.size})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Instructor — only for EGITIM */}
            {selectedSablon.category === "EGITIM" && (
              <div className="space-y-1.5">
                <Label>Eğitmen *</Label>
                <select
                  name="instructorId"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                  required
                  value={instructorId}
                  onChange={handleInstructorChange}
                >
                  <option value="">Eğitmen seçin...</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.user.name}{i.hourlyRate ? ` — ${i.hourlyRateCurrency} ${i.hourlyRate}/saat` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date/Time */}
            <div className="space-y-1.5">
              <Label>Tarih / Saat</Label>
              <Input
                type="datetime-local"
                name="scheduledAt"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            {/* Price + Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Tutar</Label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Para Birimi</Label>
                <select
                  name="currency"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Instructor earning override */}
            {selectedSablon.category === "EGITIM" && (
              <div className="space-y-1.5">
                <Label>Eğitmen Hakediş (Bu Seans)</Label>
                <Input
                  name="instructorEarning"
                  type="number"
                  step="0.01"
                  min="0"
                  value={instructorEarning}
                  onChange={(e) => setInstructorEarning(e.target.value)}
                  placeholder="Boş = profil saatlik ücreti"
                />
              </div>
            )}

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label>Ödeme Yöntemi</Label>
              <select name="paymentMethod" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                <option value="">Belirtilmedi</option>
                {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <select name="status" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                <option value="BEKLIYOR">Bekliyor</option>
                <option value="DEVAM">Devam Ediyor</option>
                <option value="TAMAMLANDI">Tamamlandı</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <textarea
                name="notes"
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                placeholder="Ek notlar..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Kaydediliyor..." : "Hizmet Ekle"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
