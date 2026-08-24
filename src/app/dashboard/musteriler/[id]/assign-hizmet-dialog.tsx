"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { assignHizmet } from "@/app/actions/hizmetler";
import { CURRENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Sablon = {
  id: string;
  category: string;
  name: string;
  defaultPrice: number;
  halfDayPrice: number | null;
  fullDayPrice: number | null;
  currency: string;
};
type Instructor = { id: string; hourlyRate: number | null; hourlyRateCurrency: string; user: { name: string } };

const CAT_LABELS: Record<string, string> = {
  EGITIM: "Eğitim",
  KIRALAMA: "Kiralama",
  URUN: "Ürün",
};

function defaultAt() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function AssignHizmetDialog({
  studentId,
  sablonlar,
  instructors,
}: {
  studentId: string;
  sablonlar: Sablon[];
  instructors: Instructor[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(assignHizmet, {});
  const prevRef = useRef(false);
  const router = useRouter();

  const [selectedSablon, setSelectedSablon] = useState<Sablon | null>(null);
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [scheduledAt, setScheduledAt] = useState(defaultAt);
  const [instructorId, setInstructorId] = useState("");
  const [instructorEarning, setInstructorEarning] = useState("");
  const [duration, setDuration] = useState<"hourly" | "half" | "full">("hourly");

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error && !state.fieldErrors) {
        setOpen(false);
        toast.success("Hizmet eklendi");
        router.refresh();
        setSelectedSablon(null);
        setPrice("0");
        setInstructorId("");
        setInstructorEarning("");
        setDuration("hourly");
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, state.fieldErrors]);

  function pickSablon(s: Sablon) {
    setSelectedSablon(s);
    setPrice(s.defaultPrice.toFixed(2));
    setCurrency(s.currency);
    setInstructorId("");
    setInstructorEarning("");
    setDuration("hourly");
  }

  function pickDuration(type: "hourly" | "half" | "full") {
    if (!selectedSablon) return;
    setDuration(type);
    if (type === "hourly") setPrice(selectedSablon.defaultPrice.toFixed(2));
    else if (type === "half" && selectedSablon.halfDayPrice != null) setPrice(selectedSablon.halfDayPrice.toFixed(2));
    else if (type === "full" && selectedSablon.fullDayPrice != null) setPrice(selectedSablon.fullDayPrice.toFixed(2));
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

        {state.error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{state.error}</p>}
        {state.fieldErrors && (
          <p className="text-sm text-red-500">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}

        {/* Service picker */}
        {!selectedSablon ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Hizmet türü seçin:</p>
            {(Object.entries(grouped) as [string, Sablon[]][]).map(([cat, items]) =>
              items.length > 0 ? (
                <div key={cat}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    {CAT_LABELS[cat]}
                  </p>
                  <div className="space-y-1">
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pickSablon(s)}
                        className="w-full flex justify-between items-center px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                      >
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        {s.defaultPrice > 0 && (
                          <span className="text-sm text-gray-500">{s.currency} {s.defaultPrice.toFixed(2)}</span>
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
                className="text-xs text-blue-600 hover:underline"
              >
                ← Değiştir
              </button>
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
                {CAT_LABELS[selectedSablon.category]} — {selectedSablon.name}
              </span>
            </div>

            {/* Duration selector for KIRALAMA */}
            {selectedSablon.category === "KIRALAMA" && (selectedSablon.halfDayPrice || selectedSablon.fullDayPrice) && (
              <div className="space-y-1.5">
                <Label>Kiralama Süresi</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => pickDuration("hourly")}
                    className={`flex-1 py-2 px-3 text-sm rounded-md border transition-all ${
                      duration === "hourly"
                        ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>Saatlik</div>
                    <div className="text-xs text-gray-500">{selectedSablon.currency} {selectedSablon.defaultPrice.toFixed(2)}</div>
                  </button>
                  {selectedSablon.halfDayPrice != null && (
                    <button
                      type="button"
                      onClick={() => pickDuration("half")}
                      className={`flex-1 py-2 px-3 text-sm rounded-md border transition-all ${
                        duration === "half"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div>Yarım Gün</div>
                      <div className="text-xs text-gray-500">{selectedSablon.currency} {selectedSablon.halfDayPrice.toFixed(2)}</div>
                    </button>
                  )}
                  {selectedSablon.fullDayPrice != null && (
                    <button
                      type="button"
                      onClick={() => pickDuration("full")}
                      className={`flex-1 py-2 px-3 text-sm rounded-md border transition-all ${
                        duration === "full"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div>Tam Gün</div>
                      <div className="text-xs text-gray-500">{selectedSablon.currency} {selectedSablon.fullDayPrice.toFixed(2)}</div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Instructor — only for EGITIM */}
            {selectedSablon.category === "EGITIM" && (
              <div className="space-y-1.5">
                <Label>Eğitmen *</Label>
                <select
                  name="instructorId"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
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
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
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
              <select name="paymentMethod" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Belirtilmedi</option>
                {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <select name="status" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
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
