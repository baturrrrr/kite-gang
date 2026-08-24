"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_MODELS, CURRENCIES } from "@/lib/constants";
import type { InstructorFormState } from "@/app/actions/instructors";
import type { Instructor } from "@/generated/prisma/client";

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

interface InstructorFormProps {
  action: (prev: InstructorFormState, formData: FormData) => Promise<InstructorFormState>;
  instructor?: Instructor & { user: { name: string; email: string } };
  title: string;
  isNew?: boolean;
}

export function InstructorForm({ action, instructor, title, isNew }: InstructorFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [paymentModel, setPaymentModel] = useState(instructor?.paymentModel ?? "HOURLY_RATE");
  const [color, setColor] = useState(instructor?.color ?? COLORS[0]);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {state.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{state.error}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Ad Soyad *</Label>
              <Input id="name" name="name" defaultValue={instructor?.user.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta *</Label>
              <Input id="email" name="email" type="email" defaultValue={instructor?.user.email} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{isNew ? "Şifre *" : "Yeni Şifre (boş bırakın = değişmez)"}</Label>
              <Input id="password" name="password" type="password" required={isNew} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" defaultValue={instructor?.phone ?? ""} />
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Takvim Rengi</Label>
            <input type="hidden" name="color" value={color} />
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "border-gray-900 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Payment Model */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700">Ödeme Modeli</h3>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <select
                name="paymentModel"
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={paymentModel}
                onChange={(e) => setPaymentModel(e.target.value)}
              >
                {Object.entries(PAYMENT_MODELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {paymentModel === "HOURLY_RATE" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Saatlik Ücret</Label>
                  <Input name="hourlyRate" type="number" step="0.01" defaultValue={instructor?.hourlyRate ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <select name="hourlyRateCurrency" className="w-full border rounded-md px-3 py-2 text-sm bg-white" defaultValue={instructor?.hourlyRateCurrency ?? "EUR"}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {paymentModel === "REVENUE_SHARE" && (
              <div className="space-y-1.5">
                <Label>Gelir Payı (%)</Label>
                <Input name="revenueShare" type="number" step="0.5" min="0" max="100" defaultValue={instructor?.revenueShare ?? "30"} />
              </div>
            )}

            {paymentModel === "SALARY_PLUS_BONUS" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Aylık Maaş</Label>
                  <Input name="monthlySalary" type="number" step="0.01" defaultValue={instructor?.monthlySalary ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <select name="salaryCurrency" className="w-full border rounded-md px-3 py-2 text-sm bg-white" defaultValue={instructor?.salaryCurrency ?? "EUR"}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
