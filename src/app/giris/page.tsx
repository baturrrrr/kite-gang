"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wind } from "lucide-react";

const initialState = { error: undefined, success: false };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Left — branding panel */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col items-center justify-center bg-slate-900 p-12">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Wind className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Kite Gang</h1>
          <p className="text-blue-400 font-semibold tracking-widest uppercase text-sm mt-1">Corner</p>
          <p className="text-slate-500 text-sm mt-6 leading-relaxed max-w-[240px] mx-auto">
            Kitesurf okulu yönetim sistemi. Müşteriler, eğitmenler ve finans tek yerden.
          </p>
        </div>

        <div className="mt-12 space-y-3 w-full max-w-[240px]">
          {[
            "Müşteri bakiye takibi",
            "Eğitmen hak ediş paneli",
            "Günlük takvim görünümü",
            "Kasa & finans raporları",
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2.5 text-slate-400 text-sm">
              <div className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
              {feat}
            </div>
          ))}
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Kite Gang Corner</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Giriş Yap</h2>
              <p className="text-sm text-slate-500 mt-1">Hesap bilgilerinizi girin</p>
            </div>

            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  E-posta
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ornek@email.com"
                  required
                  autoComplete="email"
                  className="h-10 border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Şifre
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-10 border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {state?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
                  {state.error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-1"
                disabled={isPending}
              >
                {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Kite Gang Corner © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
