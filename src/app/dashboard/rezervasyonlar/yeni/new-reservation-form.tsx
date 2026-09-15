"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createReservation } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentSelect } from "@/components/students/student-select";
import { LESSON_TYPES, CURRENCIES, EQUIPMENT_TYPES } from "@/lib/constants";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";
import { format } from "date-fns";

interface NewReservationFormProps {
  students: { id: string; firstName: string; lastName: string }[];
  instructors: { id: string; color: string; user: { name: string } }[];
  equipment: { id: string; type: string; name: string; size: string | null }[];
  onCancel?: () => void;
}

function getDefaultStartTime() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return format(nextHour, "yyyy-MM-dd'T'HH:mm");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground/85">{title}</h3>
      <div className="border rounded-xl bg-card p-4 space-y-4">{children}</div>
    </div>
  );
}

export function NewReservationForm({ students, instructors, equipment, onCancel }: NewReservationFormProps) {
  const [state, formAction, isPending] = useActionState(createReservation, {});
  const [startTime, setStartTime] = useState(getDefaultStartTime);
  const [plannedHours, setPlannedHours] = useState("2");
  const [studentId, setStudentId] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [lessonType, setLessonType] = useState("PRIVATE");
  const [rentalAmount, setRentalAmount] = useState("");
  const [rentalCurrency, setRentalCurrency] = useState("TRY");
  const rates = useExchangeRates();

  // React 19's <form action> native-resets uncontrolled <select> DOM after every
  // submit attempt (success or fieldErrors), desyncing it from our own state.
  // Remounting on each action response re-syncs the select to the real value.
  const [prevState, setPrevState] = useState(state);
  const [formGen, setFormGen] = useState(0);
  if (prevState !== state) {
    setPrevState(state);
    setFormGen((g) => g + 1);
  }

  const fieldErrors = state.fieldErrors ?? {};

  function handleRentalCurrencyChange(next: string) {
    const converted = convertAmount(Number(rentalAmount) || 0, rentalCurrency, next, rates);
    if (converted) setRentalAmount(converted.toFixed(2));
    setRentalCurrency(next);
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{state.error}</p>
      )}

      <Section title="Hizmet">
        <div className="space-y-1.5">
          <Label>Ders Tipi *</Label>
          <select
            key={formGen}
            name="lessonType"
            className="w-full border rounded-md px-3 py-2 text-sm bg-card"
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value)}
            required
          >
            {Object.entries(LESSON_TYPES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {lessonType !== "EQUIPMENT_RENTAL" && (
          <div className="space-y-1.5">
            <Label>Eğitmen *</Label>
            <select name="instructorId" className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
              <option value="">Eğitmen seçin...</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.user.name}
                </option>
              ))}
            </select>
            {fieldErrors.instructorId && <p className="text-xs text-destructive">{fieldErrors.instructorId[0]}</p>}
          </div>
        )}

        {lessonType === "EQUIPMENT_RENTAL" && (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/40">
            <div className="space-y-1.5">
              <Label>Kiralanan Ekipman *</Label>
              <select name="equipmentId" className="w-full border rounded-md px-3 py-2 text-sm bg-card" required>
                <option value="">Ekipman seçin...</option>
                {equipment.map((e) => (
                  <option key={e.id} value={e.id}>
                    {EQUIPMENT_TYPES[e.type as keyof typeof EQUIPMENT_TYPES] ?? e.type} — {e.name}
                    {e.size ? ` (${e.size})` : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.equipmentId && <p className="text-xs text-destructive">{fieldErrors.equipmentId[0]}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Kiralama Ücreti *</Label>
                <Input
                  name="rentalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rentalAmount}
                  onChange={(e) => setRentalAmount(e.target.value)}
                  required
                />
                {fieldErrors.rentalAmount && <p className="text-xs text-destructive">{fieldErrors.rentalAmount[0]}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Para Birimi</Label>
                <select
                  name="rentalCurrency"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                  value={rentalCurrency}
                  onChange={(e) => handleRentalCurrencyChange(e.target.value)}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Müşteri">
        <StudentSelect
          key={formGen}
          students={students}
          value={studentId}
          onChange={setStudentId}
          onModeChange={setCreatingStudent}
        />
        {fieldErrors.studentId && <p className="text-xs text-destructive">{fieldErrors.studentId[0]}</p>}
      </Section>

      <Section title="Zamanlama">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Başlangıç *</Label>
            <Input
              id="startTime"
              name="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            {fieldErrors.startTime && <p className="text-xs text-destructive">{fieldErrors.startTime[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plannedHours">Süre (Saat) *</Label>
            <Input
              id="plannedHours"
              name="plannedHours"
              type="number"
              step="0.5"
              min="0.5"
              value={plannedHours}
              onChange={(e) => setPlannedHours(e.target.value)}
              required
            />
            {fieldErrors.plannedHours && <p className="text-xs text-destructive">{fieldErrors.plannedHours[0]}</p>}
          </div>
        </div>
      </Section>

      <Section title="Notlar">
        <Input name="notes" placeholder="Ders notları..." />
      </Section>

      <div className="flex items-center justify-end gap-2 pt-1 border-t sticky bottom-0 bg-muted/40 backdrop-blur -mx-4 px-4 py-3 sm:static sm:bg-transparent sm:backdrop-blur-none sm:mx-0 sm:px-0 sm:py-0 sm:pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>Vazgeç</Button>
        ) : (
          <Link href="/dashboard/rezervasyonlar">
            <Button type="button" variant="outline">Vazgeç</Button>
          </Link>
        )}
        <Button type="submit" disabled={isPending || creatingStudent}>
          {isPending ? "Kaydediliyor..." : "Rezervasyon Oluştur"}
        </Button>
      </div>
    </form>
  );
}
