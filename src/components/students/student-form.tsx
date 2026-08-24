"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SKILL_LEVELS } from "@/lib/constants";
import type { StudentFormState } from "@/app/actions/students";
import type { Student } from "@/generated/prisma/client";

interface StudentFormProps {
  action: (prev: StudentFormState, formData: FormData) => Promise<StudentFormState>;
  student?: Student;
  title: string;
}

export function StudentForm({ action, student, title }: StudentFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {state.error}
            </div>
          )}

          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Kişisel Bilgiler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Ad *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={student?.firstName}
                  required
                />
                {state.fieldErrors?.firstName && (
                  <p className="text-xs text-red-500">{state.fieldErrors.firstName[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Soyad *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={student?.lastName}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={student?.email ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" defaultValue={student?.phone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationality">Uyruk</Label>
                <Input id="nationality" name="nationality" defaultValue={student?.nationality ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language">Dil</Label>
                <Input id="language" name="language" defaultValue={student?.language ?? ""} />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Acil Durum Kişisi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContact">Ad Soyad</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  defaultValue={student?.emergencyContact ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyPhone">Telefon</Label>
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  defaultValue={student?.emergencyPhone ?? ""}
                />
              </div>
            </div>
          </div>

          {/* Skill & Waiver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="skillLevel">Seviye *</Label>
              <select
                id="skillLevel"
                name="skillLevel"
                defaultValue={student?.skillLevel ?? "BEGINNER"}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                required
              >
                {Object.entries(SKILL_LEVELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="waiverSigned"
                  defaultChecked={student?.waiverSigned}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">Feragatname İmzalandı</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={student?.notes ?? ""}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-none"
              placeholder="Öğrenci hakkında notlar..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
