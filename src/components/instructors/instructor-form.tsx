"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_MODELS, CURRENCIES } from "@/lib/constants";
import { deactivateInstructor } from "@/app/actions/instructors";
import type { InstructorFormState } from "@/app/actions/instructors";
import type { Instructor } from "@/generated/prisma/client";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertAmount } from "@/lib/currency";
import { toast } from "sonner";

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
  const [name, setName] = useState(instructor?.user.name ?? "");
  const [email, setEmail] = useState(instructor?.user.email ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(instructor?.phone ?? "");
  const [paymentModel, setPaymentModel] = useState(instructor?.paymentModel ?? "HOURLY_RATE");
  const [color, setColor] = useState(instructor?.color ?? COLORS[0]);
  const [hourlyRate, setHourlyRate] = useState(instructor?.hourlyRate?.toString() ?? "");
  const [hourlyRateCurrency, setHourlyRateCurrency] = useState(instructor?.hourlyRateCurrency ?? "TRY");
  const [revenueShare, setRevenueShare] = useState(instructor?.revenueShare?.toString() ?? "30");
  const [monthlySalary, setMonthlySalary] = useState(instructor?.monthlySalary?.toString() ?? "");
  const [salaryCurrency, setSalaryCurrency] = useState(instructor?.salaryCurrency ?? "TRY");
  const [isDeleting, setIsDeleting] = useState(false);
  const rates = useExchangeRates();
  const router = useRouter();

  async function handleDelete() {
    if (!instructor) return;
    if (!confirm(`"${instructor.user.name}" eğitmenini silmek istediğinize emin misiniz? Bu eğitmen artık listelenmeyecek ve sisteme giriş yapamayacak.`)) return;
    setIsDeleting(true);
    const result = await deactivateInstructor(instructor.id);
    if (result?.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }
    toast.success("Eğitmen silindi");
    router.push("/dashboard/egitmenler");
  }

  function handleHourlyRateCurrencyChange(next: string) {
    const converted = convertAmount(Number(hourlyRate) || 0, hourlyRateCurrency, next, rates);
    if (converted) setHourlyRate(converted.toFixed(2));
    setHourlyRateCurrency(next);
  }

  function handleSalaryCurrencyChange(next: string) {
    const converted = convertAmount(Number(monthlySalary) || 0, salaryCurrency, next, rates);
    if (converted) setMonthlySalary(converted.toFixed(2));
    setSalaryCurrency(next);
  }

  return (
    <form action={formAction}>
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{state.error}</p>
          )}
          {state.fieldErrors && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
              {Object.values(state.fieldErrors).flat()[0]}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Ad Soyad *</Label>
              <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta *</Label>
              <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{isNew ? "Şifre *" : "Yeni Şifre (boş bırakın = değişmez)"}</Label>
              <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={isNew} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                    color === c ? "border-border scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Payment Model */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-foreground/85">Ödeme Modeli</h3>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <select
                name="paymentModel"
                className="w-full border rounded-md px-3 py-2 text-sm bg-card"
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
                  <Input name="hourlyRate" type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <select name="hourlyRateCurrency" className="w-full border rounded-md px-3 py-2 text-sm bg-card" value={hourlyRateCurrency} onChange={(e) => handleHourlyRateCurrencyChange(e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {paymentModel === "REVENUE_SHARE" && (
              <div className="space-y-1.5">
                <Label>Gelir Payı (%)</Label>
                <Input name="revenueShare" type="number" step="0.5" min="0" max="100" value={revenueShare} onChange={(e) => setRevenueShare(e.target.value)} />
              </div>
            )}

            {paymentModel === "SALARY_PLUS_BONUS" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Aylık Maaş</Label>
                  <Input name="monthlySalary" type="number" step="0.01" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <select name="salaryCurrency" className="w-full border rounded-md px-3 py-2 text-sm bg-card" value={salaryCurrency} onChange={(e) => handleSalaryCurrencyChange(e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center pt-2 ${!isNew && instructor ? "justify-between" : "justify-end"}`}>
            {!isNew && instructor && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Siliniyor..." : "Eğitmeni Sil"}
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
