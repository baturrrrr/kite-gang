"use client";

import { useActionState, useState } from "react";
import { createReservation } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LESSON_TYPES } from "@/lib/constants";
import { format } from "date-fns";

interface NewReservationFormProps {
  students: { id: string; firstName: string; lastName: string }[];
  instructors: { id: string; color: string; user: { name: string } }[];
}

function getDefaultStartTime() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return format(nextHour, "yyyy-MM-dd'T'HH:mm");
}

export function NewReservationForm({ students, instructors }: NewReservationFormProps) {
  const [state, formAction, isPending] = useActionState(createReservation, {});
  const [startTime, setStartTime] = useState(getDefaultStartTime);
  const [plannedHours, setPlannedHours] = useState("2");

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rezervasyon Bilgileri</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label>Öğrenci *</Label>
            <select name="studentId" className="w-full border rounded-md px-3 py-2 text-sm bg-white" required>
              <option value="">Öğrenci seçin...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName}, {s.firstName}
                </option>
              ))}
            </select>
            {fieldErrors.studentId && <p className="text-xs text-red-500">{fieldErrors.studentId[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Eğitmen *</Label>
            <select name="instructorId" className="w-full border rounded-md px-3 py-2 text-sm bg-white" required>
              <option value="">Eğitmen seçin...</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.user.name}
                </option>
              ))}
            </select>
            {fieldErrors.instructorId && <p className="text-xs text-red-500">{fieldErrors.instructorId[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Ders Tipi *</Label>
            <select name="lessonType" className="w-full border rounded-md px-3 py-2 text-sm bg-white" required>
              {Object.entries(LESSON_TYPES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

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
              {fieldErrors.startTime && <p className="text-xs text-red-500">{fieldErrors.startTime[0]}</p>}
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
              {fieldErrors.plannedHours && <p className="text-xs text-red-500">{fieldErrors.plannedHours[0]}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Input id="notes" name="notes" placeholder="Ders notları..." />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Rezervasyon Oluştur"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
