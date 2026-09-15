"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";

const initialState = { error: undefined, success: false };

const FEATURES = ["Müşteri ve paket takibi", "Eğitmen hakediş portalı", "Günlük operasyon ve check-in", "Kasa ve finans raporları"];

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Marka paneli */}
      <div className="relative hidden w-[480px] shrink-0 flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_320px_at_0%_100%,rgb(215_255_63/0.10),transparent_70%)]" />
        <Logo size="md" className="relative" />
        <div className="relative space-y-6">
          <h1 className="text-6xl leading-[0.9] font-extrabold">
            Rüzgar senden,
            <br />
            <span className="text-primary">gerisi bizden.</span>
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-sidebar-foreground">
            Kitesurf okulunun rezervasyonları, eğitmenleri ve kasası tek panelde.
          </p>
          <ul className="space-y-2.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-sidebar-foreground">
                <span className="size-2 rounded-[2px] bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/50">Kite Gang Corner © {new Date().getFullYear()}</p>
      </div>

      {/* Giriş formu */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo size="md" className="mb-10 lg:hidden" />

          <div className="mb-8 space-y-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-[2px] bg-primary" />
              <span className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Yönetim paneli</span>
            </div>
            <h2 className="text-5xl leading-[0.95] font-extrabold">Giriş yap</h2>
            <p className="text-sm text-muted-foreground">Hesap bilgilerinle devam et</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ornek@email.com"
                required
                autoComplete="email"
                className="h-12 bg-card text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-12 bg-card text-base"
              />
            </div>

            {state?.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <Button type="submit" className="mt-2 h-12 w-full text-base" disabled={isPending}>
              {isPending ? "Giriş yapılıyor..." : "Giriş yap"}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-muted-foreground/70 lg:hidden">
            Kite Gang Corner © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
