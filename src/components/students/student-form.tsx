"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENDER_OPTIONS, COUNTRIES, LANGUAGES } from "@/lib/constants";
import type { StudentFormState } from "@/app/actions/students";
import type { Student } from "@/generated/prisma/client";

interface StudentFormProps {
  action: (prev: StudentFormState, formData: FormData) => Promise<StudentFormState>;
  student?: Student;
  title?: string;
  cancelHref?: string;
  onCancel?: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground/85">{title}</h3>
      <div className="border rounded-xl bg-card p-4">{children}</div>
    </div>
  );
}

function formatDateInput(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export function StudentForm({ action, student, title, cancelHref = "/dashboard/musteriler", onCancel }: StudentFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const router = useRouter();

  return (
    <form action={formAction} className="space-y-5">
      {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
      {state.error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">
          {state.error}
        </div>
      )}

      <Section title="Kişisel Bilgiler">
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
              <p className="text-xs text-destructive">{state.fieldErrors.firstName[0]}</p>
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
            <Label htmlFor="birthDate">Doğum Tarihi</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={formatDateInput(student?.birthDate)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">Kilo (kg)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.5"
              min="0"
              placeholder="Kilo (kg)"
              defaultValue={student?.weight ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Cinsiyet</Label>
            <select
              id="gender"
              name="gender"
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
              defaultValue={student?.gender ?? ""}
            >
              <option value="">Bir seçenek seçin</option>
              {Object.entries(GENDER_OPTIONS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="İletişim Bilgileri">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta (Opsiyonel)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@gmail.com"
              defaultValue={student?.email ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon Numarası (Opsiyonel)</Label>
            <Input id="phone" name="phone" placeholder="+90 5xx xxx xx xx" defaultValue={student?.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nationality">Ülke</Label>
            <select
              id="nationality"
              name="nationality"
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
              defaultValue={student?.nationality ?? ""}
            >
              <option value="">Ülke seçin</option>
              {/* Mevcut kayıtlı değer listede yoksa veri kaybı olmasın diye seçenek olarak eklenir */}
              {student?.nationality && !COUNTRIES.includes(student.nationality) && (
                <option value={student.nationality}>{student.nationality}</option>
              )}
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="language">Dil</Label>
            <select
              id="language"
              name="language"
              className="w-full border rounded-md px-3 py-2 text-sm bg-card"
              defaultValue={student?.language ?? ""}
            >
              <option value="">Dil seçin</option>
              {student?.language && !LANGUAGES.includes(student.language) && (
                <option value={student.language}>{student.language}</option>
              )}
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Acil Durum Kişisi">
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
      </Section>

      <Section title="Diğer Bilgiler">
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="waiverSigned"
              defaultChecked={student?.waiverSigned}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">Feragatname İmzalandı</span>
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Diğer Notlar</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={student?.notes ?? ""}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm bg-card resize-none"
              placeholder="Öğrenci hakkında notlar..."
            />
          </div>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel ?? (() => router.push(cancelHref))}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
