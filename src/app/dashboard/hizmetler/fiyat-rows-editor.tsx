"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { CURRENCIES } from "@/lib/constants";
import { ZAMAN_BIRIMLERI } from "@/lib/constants";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";

export type FiyatRow = { zamanBirimi: string; currency: string; price: string };

export function emptyFiyatRow(category: string): FiyatRow {
  return {
    zamanBirimi: category === "KIRALAMA" ? "SAATLIK" : "SABIT",
    currency: "TRY",
    price: "0",
  };
}

export function FiyatRowsEditor({
  rows,
  onChange,
  category,
}: {
  rows: FiyatRow[];
  onChange: (rows: FiyatRow[]) => void;
  category: string;
}) {
  const rates = useExchangeRates();

  function updateRow(idx: number, patch: Partial<FiyatRow>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function updateRowCurrency(idx: number, nextCurrency: string) {
    const row = rows[idx];
    const converted = convertAmount(Number(row.price) || 0, row.currency, nextCurrency, rates);
    updateRow(idx, { currency: nextCurrency, price: converted ? converted.toFixed(2) : row.price });
  }

  function removeRow(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  function addRow() {
    onChange([...rows, emptyFiyatRow(category)]);
  }

  return (
    <div className="space-y-2">
      <Label>Fiyat Satırları *</Label>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              className="w-24 flex-shrink-0 border rounded-md px-1.5 py-2 text-xs bg-card"
              value={row.zamanBirimi}
              onChange={(e) => updateRow(idx, { zamanBirimi: e.target.value })}
            >
              {Object.entries(ZAMAN_BIRIMLERI).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              className="w-16 flex-shrink-0 border rounded-md px-1.5 py-2 text-xs bg-card"
              value={row.currency}
              onChange={(e) => updateRowCurrency(idx, e.target.value)}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="flex-1 min-w-0"
              value={row.price}
              onChange={(e) => updateRow(idx, { price: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Para birimi / zaman birimi satırı ekle
      </Button>
    </div>
  );
}
