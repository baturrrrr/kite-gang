"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold">Bir şeyler ters gitti</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da ana sayfaya dönebilirsin.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground/70">Hata kodu: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button className="h-11 px-5" onClick={() => unstable_retry()}>
          <RotateCcw />
          Tekrar dene
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "h-11 px-5" })}>
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
