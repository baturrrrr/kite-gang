"use client";

import React, { useState, useActionState, useEffect, useRef, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Pencil, Calendar, Clock, User, ChevronRight, Check, AlertCircle,
  GraduationCap, Wrench, ShoppingBag, CalendarDays, ConciergeBell,
} from "lucide-react";
import { updateHizmet, updateHizmetStatus, deleteHizmet } from "@/app/actions/hizmetler";
import { CURRENCIES, PAYMENT_METHODS, HIZMET_CATEGORIES } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatTRY } from "@/lib/currency";
import { useExchangeRates } from "@/hooks/use-exchange-rates";

type Instructor = { id: string; hourlyRate: number | null; user: { name: string } };

type HizmetData = {
  id: string;
  category: string;
  title: string;
  amount: number;
  currency: string;
  durationHours: number | null;
  instructorEarning: number | null;
  status: string;
  scheduledAt: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  notes: string | null;
  paymentMethod: string | null;
  instructor: { id: string; user: { name: string } } | null;
};

const STATUS_STYLE: Record<string, string> = {
  BEKLIYOR:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  DEVAM:      "bg-blue-100 text-blue-700 border-blue-200",
  TAMAMLANDI: "bg-green-100 text-green-700 border-green-200",
  IPTAL:      "bg-red-100 text-red-500 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  DEVAM: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal",
};
const CAT_ICON: Record<string, React.ElementType> = {
  EGITIM: GraduationCap,
  KIRALAMA: Wrench,
  URUN: ShoppingBag,
  ETKINLIK: CalendarDays,
};

export function HizmetDetailDialog({
  hizmet,
  studentId,
  instructors,
}: {
  hizmet: HizmetData;
  studentId: string;
  instructors: Instructor[];
}) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const router = useRouter();
  const rates = useExchangeRates();

  // Saatlik hesaplama state'leri — edit moda girilince sıfırlanır
  const initHours = String(hizmet.durationHours ?? "");
  const initCustHourly = hizmet.durationHours && hizmet.durationHours > 0
    ? String((hizmet.amount / hizmet.durationHours).toFixed(2))
    : String(hizmet.amount);
  const initInstrHourly = hizmet.durationHours && hizmet.durationHours > 0 && hizmet.instructorEarning
    ? String((hizmet.instructorEarning / hizmet.durationHours).toFixed(2))
    : String(hizmet.instructorEarning ?? "");

  const [hours, setHours] = useState(initHours);
  const [custHourly, setCustHourly] = useState(initCustHourly);
  const [instrHourly, setInstrHourly] = useState(initInstrHourly);

  // Hesaplanan toplamlar (form hidden input'larına yazılır)
  const h = parseFloat(hours) || 0;
  const custTotal = h > 0 && parseFloat(custHourly) >= 0
    ? (h * parseFloat(custHourly)).toFixed(2)
    : custHourly;
  const instrTotal = h > 0 && parseFloat(instrHourly) >= 0
    ? (h * parseFloat(instrHourly)).toFixed(2)
    : instrHourly;

  function openEdit() {
    setHours(initHours);
    setCustHourly(initCustHourly);
    setInstrHourly(initInstrHourly);
    setEditMode(true);
  }

  const bound = updateHizmet.bind(null, hizmet.id, studentId);
  const [state, formAction, isPending] = useActionState(bound, {});
  const prevRef = useRef(false);

  useEffect(() => {
    if (prevRef.current && !isPending) {
      if (!state.error) {
        setEditMode(false);
        toast.success("Hizmet güncellendi");
        router.refresh();
      }
    }
    prevRef.current = isPending;
  }, [isPending, state.error, router]);

  const [advancing, startAdvance] = useTransition();
  const [cancelling, startCancel] = useTransition();

  function advanceStatus() {
    const next = hizmet.status === "BEKLIYOR" ? "DEVAM" : "TAMAMLANDI";
    startAdvance(async () => {
      await updateHizmetStatus(hizmet.id, studentId, next as "DEVAM" | "TAMAMLANDI");
      toast.success(next === "DEVAM" ? "Başlatıldı" : "Tamamlandı");
      router.refresh();
    });
  }

  function cancelHizmet() {
    startCancel(async () => {
      await deleteHizmet(hizmet.id, studentId);
      toast.success("İptal edildi");
      router.refresh();
      setOpen(false);
    });
  }

  const nextLabel = hizmet.status === "BEKLIYOR" ? "Başlat" : hizmet.status === "DEVAM" ? "Tamamla" : null;
  const Icon = CAT_ICON[hizmet.category] ?? ConciergeBell;

  return (
    <>
      {/* Tablo satırı — tıklanabilir */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { setOpen(true); setEditMode(false); setConfirmCancel(false); }}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        style={{
          display: "grid",
          gridTemplateColumns: "36px 1fr auto auto auto",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid #f3f4f6",
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        className="hover:bg-gray-50 last:border-0"
      >
        {/* İkon */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}>
          <Icon size={15} />
        </div>

        {/* Başlık + tarih */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hizmet.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {hizmet.scheduledAt && (
              <span style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={11} />
                {format(new Date(hizmet.scheduledAt), "d MMM HH:mm", { locale: tr })}
              </span>
            )}
            {hizmet.instructor && (
              <span style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                <User size={11} />
                {hizmet.instructor.user.name}
              </span>
            )}
          </div>
        </div>

        {/* Kategori */}
        <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
          {HIZMET_CATEGORIES[hizmet.category as keyof typeof HIZMET_CATEGORIES] ?? hizmet.category}
        </span>

        {/* Durum badge */}
        <Badge variant="outline" className={`text-xs whitespace-nowrap ${STATUS_STYLE[hizmet.status] ?? ""}`}>
          {STATUS_LABEL[hizmet.status] ?? hizmet.status}
        </Badge>

        {/* Tutar */}
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", textAlign: "right", whiteSpace: "nowrap" }}>
          {hizmet.amount > 0 ? formatTRY(hizmet.amount, hizmet.currency, rates) : "—"}
        </span>
      </div>

      {/* Detail / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditMode(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {!editMode ? (
            /* ── DETAIL VIEW ──────────────────────────────────── */
            <>
              <DialogHeader>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <DialogTitle style={{ fontSize: 16 }}>{hizmet.title}</DialogTitle>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLE[hizmet.status] ?? ""}`}>
                        {STATUS_LABEL[hizmet.status] ?? hizmet.status}
                      </Badge>
                    </div>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      {HIZMET_CATEGORIES[hizmet.category as keyof typeof HIZMET_CATEGORIES] ?? hizmet.category}
                    </p>
                  </div>
                  {hizmet.status !== "IPTAL" && (
                    <button
                      type="button"
                      onClick={openEdit}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "6px 12px",
                        background: "#fff",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={13} />
                      Düzenle
                    </button>
                  )}
                </div>
              </DialogHeader>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Tutar kutusu */}
                <div style={{ background: "#f9fafb", border: "1px solid #f0f0f0", borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    Müşteriye Yansıtılan
                  </p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
                    {formatTRY(hizmet.amount, hizmet.currency, rates)}
                  </p>
                  {hizmet.paymentMethod && (
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                      {PAYMENT_METHODS[hizmet.paymentMethod as keyof typeof PAYMENT_METHODS] ?? hizmet.paymentMethod}
                    </p>
                  )}
                </div>

                {/* Tarih / Personel */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {hizmet.scheduledAt && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#4b5563" }}>
                      <Calendar size={15} color="#9ca3af" />
                      {format(new Date(hizmet.scheduledAt), "d MMMM yyyy, EEEE · HH:mm", { locale: tr })}
                    </div>
                  )}
                  {hizmet.instructor && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#4b5563" }}>
                      <User size={15} color="#9ca3af" />
                      {hizmet.instructor.user.name}
                    </div>
                  )}
                  {(hizmet.checkedInAt || hizmet.checkedOutAt) && (
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      {hizmet.checkedInAt && (
                        <span style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={13} /> Giriş: {format(new Date(hizmet.checkedInAt), "HH:mm")}
                        </span>
                      )}
                      {hizmet.checkedOutAt && (
                        <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                          <Check size={13} /> Çıkış: {format(new Date(hizmet.checkedOutAt), "HH:mm")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {hizmet.notes && (
                  <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                    "{hizmet.notes}"
                  </div>
                )}

                {/* Personel hakedişi */}
                {hizmet.instructorEarning != null && hizmet.instructorEarning > 0 && (
                  <div style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: "12px 16px" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Personel Hakedişi
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, color: "#6b7280" }}>
                        {hizmet.instructor?.user.name ?? "Personel"}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                        {formatTRY(hizmet.instructorEarning, hizmet.currency, rates)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Aksiyon butonları */}
                {hizmet.status !== "IPTAL" && hizmet.status !== "TAMAMLANDI" && (
                  <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", gap: 8 }}>
                    {nextLabel && (
                      <button
                        type="button"
                        onClick={advanceStatus}
                        disabled={advancing}
                        style={{
                          flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
                          background: advancing ? "#9ca3af" : "#111827", color: "#fff",
                          fontSize: 14, fontWeight: 600, cursor: advancing ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        {advancing ? "..." : <><ChevronRight size={16} />{nextLabel}</>}
                      </button>
                    )}

                    {!confirmCancel ? (
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(true)}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: 10,
                          border: "1px solid #fca5a5", background: "#fff", color: "#ef4444",
                          fontSize: 14, fontWeight: 500, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <AlertCircle size={15} /> İptal Et
                      </button>
                    ) : (
                      <div style={{ flex: 1, display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={cancelHizmet}
                          disabled={cancelling}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                            background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {cancelling ? "..." : "Onayla"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancel(false)}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 10,
                            border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280",
                            fontSize: 13, fontWeight: 500, cursor: "pointer",
                          }}
                        >
                          Geri
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── EDIT FORM ────────────────────────────────────── */
            <>
              <DialogHeader>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    style={{ fontSize: 12, color: "#9ca3af", cursor: "pointer", background: "none", border: "none" }}
                  >
                    ← Geri
                  </button>
                  <DialogTitle style={{ fontSize: 16 }}>Hizmeti Düzenle</DialogTitle>
                </div>
              </DialogHeader>

              <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {state.error && (
                  <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", padding: "10px 14px", borderRadius: 8 }}>
                    {state.error}
                  </p>
                )}

                {/* MÜŞTERİYE YANSITILAN */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Müşteriye Yansıtılan
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Başlık</Label>
                    <Input name="title" defaultValue={hizmet.title} required className="text-sm" />
                  </div>

                  {/* Saat sayısı */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Saat Sayısı</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Ör: 3"
                      className="text-sm"
                    />
                  </div>

                  {/* Saatlik ücret + para birimi */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs text-gray-500">Saatlik Fiyat</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={custHourly}
                        onChange={(e) => setCustHourly(e.target.value)}
                        placeholder="Ör: 3000"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Para Birimi</Label>
                      <select name="currency" defaultValue={hizmet.currency} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Toplam (otomatik hesaplı) */}
                  <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {h > 0 ? `${h} saat × ${parseFloat(custHourly) || 0} =` : "Toplam Tutar"}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                      {parseFloat(custTotal) > 0 ? `${parseFloat(custTotal).toLocaleString("tr-TR")} ${hizmet.currency}` : "—"}
                    </span>
                  </div>

                  {/* Hesaplanan toplam — form'a gönderilir */}
                  <input type="hidden" name="amount" value={custTotal || "0"} />
                  <input type="hidden" name="durationHours" value={hours || "0"} />
                </div>

                {/* PERSONEL HAKEDİŞİ */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Personel Hakedişi
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Personel</Label>
                    <select name="instructorId" defaultValue={hizmet.instructor?.id ?? ""} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                      <option value="">Belirtilmedi</option>
                      {instructors.map((i) => <option key={i.id} value={i.id}>{i.user.name}</option>)}
                    </select>
                  </div>

                  {/* Saatlik hakediş */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Saatlik Personel Ücreti</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={instrHourly}
                      onChange={(e) => setInstrHourly(e.target.value)}
                      placeholder="Ör: 1000"
                      className="text-sm"
                    />
                  </div>

                  {/* Toplam hakediş (otomatik) */}
                  {instrHourly !== "" && (
                    <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {h > 0 ? `${h} saat × ${parseFloat(instrHourly) || 0} =` : "Toplam Hakediş"}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                        {parseFloat(instrTotal) > 0 ? `${parseFloat(instrTotal).toLocaleString("tr-TR")} ${hizmet.currency}` : "—"}
                      </span>
                    </div>
                  )}

                  {/* Hesaplanan hakediş — form'a gönderilir */}
                  <input type="hidden" name="instructorEarning" value={instrTotal || ""} />
                </div>

                {/* Tarih & Saat */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Tarih / Saat</Label>
                  <Input
                    type="datetime-local"
                    name="scheduledAt"
                    defaultValue={hizmet.scheduledAt ? format(new Date(hizmet.scheduledAt), "yyyy-MM-dd'T'HH:mm") : ""}
                    className="text-sm"
                  />
                </div>

                {/* Durum */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Durum</Label>
                  <select name="status" defaultValue={hizmet.status} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    <option value="BEKLIYOR">Bekliyor</option>
                    <option value="DEVAM">Devam Ediyor</option>
                    <option value="TAMAMLANDI">Tamamlandı</option>
                    <option value="IPTAL">İptal</option>
                  </select>
                </div>

                {/* Ödeme yöntemi */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Ödeme Yöntemi</Label>
                  <select name="paymentMethod" defaultValue={hizmet.paymentMethod ?? ""} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">Belirtilmedi</option>
                    {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>

                {/* Notlar */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Notlar</Label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={hizmet.notes ?? ""}
                    placeholder="Ek notlar..."
                    className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                {/* Kaydet */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      padding: "10px 24px", borderRadius: 10, border: "none",
                      background: isPending ? "#9ca3af" : "#111827", color: "#fff",
                      fontSize: 14, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
