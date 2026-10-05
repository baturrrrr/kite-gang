"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FormSheet,
  FormSheetActions,
  FormSheetSection,
} from "@/components/ui/form-sheet";

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

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground/85 hover:border-foreground/25 hover:bg-muted/40"
      )}
    >
      <span>{label}</span>
      {selected && <Check className="size-[15px]" />}
    </button>
  );
}

function SectionHeader({
  title,
  onClear,
}: {
  title: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-heading text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Temizle
        </button>
      )}
    </div>
  );
}

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

  // Panel her açılışta sayfadaki güncel filtrelerle başlar
  function handleOpenChange(next: boolean) {
    if (next) {
      setSelTypes([...activeTypes]);
      setSelStatuses([...activeStatuses]);
    }
    setOpen(next);
  }

  function toggle(
    key: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  function apply() {
    const params = new URLSearchParams({ from, to });
    if (selTypes.length) params.set("types", selTypes.join(","));
    if (selStatuses.length) params.set("statuses", selStatuses.join(","));
    router.push(`/dashboard/rezervasyonlar?${params.toString()}`);
    setOpen(false);
  }

  const totalActive = activeTypes.length + activeStatuses.length;
  const pendingCount = selTypes.length + selStatuses.length;

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      icon={SlidersHorizontal}
      title="Filtrele"
      description={pendingCount > 0 ? `${pendingCount} seçili` : undefined}
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/40"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrele
          {totalActive > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {totalActive}
            </span>
          )}
        </button>
      }
    >
      <div className="space-y-8">
        <FormSheetSection>
          <SectionHeader
            title="Hizmet Türü"
            onClear={selTypes.length ? () => setSelTypes([]) : undefined}
          />
          <div className="flex flex-col gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.key}
                label={opt.label}
                selected={selTypes.includes(opt.key)}
                onClick={() => toggle(opt.key, setSelTypes)}
              />
            ))}
          </div>
        </FormSheetSection>

        <FormSheetSection>
          <SectionHeader
            title="Katılım Durumu"
            onClear={selStatuses.length ? () => setSelStatuses([]) : undefined}
          />
          <div className="flex flex-col gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.key}
                label={opt.label}
                selected={selStatuses.includes(opt.key)}
                onClick={() => toggle(opt.key, setSelStatuses)}
              />
            ))}
          </div>
        </FormSheetSection>
      </div>

      <FormSheetActions className="gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            setSelTypes([]);
            setSelStatuses([]);
          }}
        >
          <X className="h-3.5 w-3.5" />
          Temizle
        </Button>
        <Button type="button" className="flex-[2]" onClick={apply}>
          <Check className="h-3.5 w-3.5" />
          Uygula {pendingCount > 0 ? `(${pendingCount})` : ""}
        </Button>
      </FormSheetActions>
    </FormSheet>
  );
}
