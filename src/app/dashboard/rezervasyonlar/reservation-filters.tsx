"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X, Check } from "lucide-react";

const TYPE_OPTIONS = [
  { key: "PRIVATE",          label: "Özel Ders"       },
  { key: "SEMI_PRIVATE",     label: "Yarı Özel"        },
  { key: "GROUP",            label: "Grup Dersi"       },
  { key: "EQUIPMENT_RENTAL", label: "Ekipman Kiralama" },
  { key: "SUPERVISION",      label: "Süpervizyon"      },
];

const STATUS_OPTIONS = [
  { key: "PLANNED",         label: "Bekleniyor"    },
  { key: "CHECKED_IN",      label: "Check-in"      },
  { key: "COMPLETED",       label: "Tamamlandı"    },
  { key: "CANCELLED",       label: "İptal"         },
  { key: "NO_SHOW",         label: "Gelmedi"       },
  { key: "WIND_CANCELLED",  label: "Rüzgar İptali" },
];

export function ReservationFilterSheet({
  from,
  to,
  activeTypes,
  activeStatuses,
}: {
  from: string;
  to: string;
  activeTypes: string[];
  activeStatuses: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selTypes, setSelTypes] = useState<string[]>(activeTypes);
  const [selStatuses, setSelStatuses] = useState<string[]>(activeStatuses);
  const panelRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklandığında kapat
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Panel açılınca mevcut filtreleri yükle
  function openPanel() {
    setSelTypes([...activeTypes]);
    setSelStatuses([...activeStatuses]);
    setOpen(true);
  }

  function toggleType(key: string) {
    setSelTypes(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  }

  function toggleStatus(key: string) {
    setSelStatuses(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  }

  function apply() {
    const params = new URLSearchParams({ from, to });
    if (selTypes.length)    params.set("types",    selTypes.join(","));
    if (selStatuses.length) params.set("statuses", selStatuses.join(","));
    router.push(`/dashboard/rezervasyonlar?${params.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    setSelTypes([]);
    setSelStatuses([]);
  }

  const totalActive = activeTypes.length + activeStatuses.length;
  const pendingCount = selTypes.length + selStatuses.length;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Filtrele tetikleyici */}
      <button
        type="button"
        onClick={openPanel}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtrele
        {totalActive > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold">
            {totalActive}
          </span>
        )}
      </button>

      {/* Panel — Dialog/Sheet kullanmıyoruz, saf CSS dropdown */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            background: "#fff",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Başlık */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SlidersHorizontal size={16} color="#6b7280" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Filtrele</span>
              {pendingCount > 0 && (
                <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
                  {pendingCount} seçili
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* İçerik */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>

            {/* Hizmet Türü */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Hizmet Türü</span>
                {selTypes.length > 0 && (
                  <button type="button" onClick={() => setSelTypes([])} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Temizle</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TYPE_OPTIONS.map(opt => {
                  const sel = selTypes.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleType(opt.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: sel ? "1px solid #1f2937" : "1px solid #e5e7eb",
                        background: sel ? "#1f2937" : "#fff",
                        color: sel ? "#fff" : "#374151",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>{opt.label}</span>
                      {sel && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Katılım Durumu */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Katılım Durumu</span>
                {selStatuses.length > 0 && (
                  <button type="button" onClick={() => setSelStatuses([])} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Temizle</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STATUS_OPTIONS.map(opt => {
                  const sel = selStatuses.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleStatus(opt.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: sel ? "1px solid #1f2937" : "1px solid #e5e7eb",
                        background: sel ? "#1f2937" : "#fff",
                        color: sel ? "#fff" : "#374151",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>{opt.label}</span>
                      {sel && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alt butonlar */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0", background: "#fafafa", display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={clearAll}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <X size={14} />
              Temizle
            </button>
            <button
              type="button"
              onClick={apply}
              style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Check size={14} />
              Uygula {pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* Overlay — panelin arkası */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 9998 }}
        />
      )}
    </div>
  );
}
