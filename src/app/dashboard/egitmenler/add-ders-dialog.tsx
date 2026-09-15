"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import { assignHizmet } from "@/app/actions/hizmetler";
import { StudentSelect } from "@/components/students/student-select";
import { CURRENCIES, PAYMENT_METHODS, ZAMAN_BIRIMLERI } from "@/lib/constants";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Fiyat = { zamanBirimi: string; currency: string; price: number };
type Sablon = { id: string; name: string; fiyatlar: Fiyat[] };
type Student = { id: string; firstName: string; lastName: string };

function defaultAt() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function AddDersDialog({
  instructorId,
  instructorName,
  hourlyRate,
  hourlyRateCurrency,
  sablonlar,
  students,
}: {
  instructorId: string;
  instructorName: string;
  hourlyRate: number | null;
  hourlyRateCurrency: string;
  sablonlar: Sablon[];
  students: Student[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(assignHizmet, {});
  const prevRef = useRef(false);
  const router = useRouter();
  const rates = useExchangeRates();

  const [studentId, setStudentId] = useState("");
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [sablonId, setSablonId] = useState(sablonlar[0]?.id ?? "");
  const [activeFiyatIdx, setActiveFiyatIdx] = useState(0);
  const [price, setPrice] = useState(sablonlar[0]?.fiyatlar[0]?.price.toFixed(2) ?? "0");
  const [currency, setCurrency] = useState(sablonlar[0]?.fiyatlar[0]?.currency ?? "TRY");
  const [scheduledAt, setScheduledAt] = useState(defaultAt);
  const [instructorEarning, setInstructorEarning] = useState(hourlyRate?.toString() ?? "");

  const selectedSablon = sablonlar.find((s) => s.id === sablonId) ?? null;

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Ders eklendi");
        router.refresh();
        setStudentId("");
        setScheduledAt(defaultAt());
        setInstructorEarning(hourlyRate?.toString() ?? "");
        setShowNewStudent(false);
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  function handleSablonChange(id: string) {
    setSablonId(id);
    const s = sablonlar.find((x) => x.id === id);
    const first = s?.fiyatlar[0];
    setActiveFiyatIdx(0);
    setPrice((first?.price ?? 0).toFixed(2));
    setCurrency(first?.currency ?? "TRY");
  }

  function pickFiyat(idx: number) {
    const f = selectedSablon?.fiyatlar[idx];
    if (!f) return;
    setActiveFiyatIdx(idx);
    setPrice(f.price.toFixed(2));
    setCurrency(f.currency);
  }

  function handleCurrencyChange(next: string) {
    const converted = convertAmount(Number(price) || 0, currency, next, rates);
    if (converted) setPrice(converted.toFixed(2));
    setCurrency(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <GraduationCap className="w-3.5 h-3.5 mr-1" /> Ders Ekle
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{instructorName} — Ders Ekle</DialogTitle>
        </DialogHeader>

        {state.error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>}
        {state.fieldErrors && (
          <p className="text-sm text-destructive">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="category" value="EGITIM" />
          <input type="hidden" name="instructorId" value={instructorId} />
          <input type="hidden" name="sablonId" value={sablonId} />
          <input type="hidden" name="title" value={selectedSablon?.name ?? ""} />

          <StudentSelect
            students={students}
            value={studentId}
            onChange={setStudentId}
            onModeChange={setShowNewStudent}
          />

          <div className="space-y-1.5">
            <Label>Ders Tipi *</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
              required
              value={sablonId}
              onChange={(e) => handleSablonChange(e.target.value)}
            >
              {sablonlar.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selectedSablon && selectedSablon.fiyatlar.length > 1 && (
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

          <div className="space-y-1.5">
            <Label>Tarih / Saat</Label>
            <Input
              type="datetime-local"
              name="scheduledAt"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

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

          <div className="space-y-1.5">
            <Label>Eğitmen Hakediş (Bu Seans)</Label>
            <Input
              name="instructorEarning"
              type="number"
              step="0.01"
              min="0"
              value={instructorEarning}
              onChange={(e) => setInstructorEarning(e.target.value)}
              placeholder={hourlyRate ? `Boş = ${hourlyRateCurrency} ${hourlyRate}/saat` : "Boş = profil saatlik ücreti"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ödeme Yöntemi</Label>
            <select name="paymentMethod" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
              <option value="">Belirtilmedi</option>
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Durum</Label>
            <select name="status" className="w-full border rounded-md px-3 py-2 text-sm bg-card">
              <option value="BEKLIYOR">Bekliyor</option>
              <option value="DEVAM">Devam Ediyor</option>
              <option value="TAMAMLANDI">Tamamlandı</option>
            </select>
          </div>

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
            <Button type="submit" disabled={isPending || !sablonId || showNewStudent}>
              {isPending ? "Kaydediliyor..." : "Ders Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
