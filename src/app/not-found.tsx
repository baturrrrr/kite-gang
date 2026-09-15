import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Compass className="size-7" />
        </div>
        <h1 className="text-5xl font-extrabold">Sayfa bulunamadı</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ className: "h-11 px-6" })}>
        Ana sayfaya dön
      </Link>
    </div>
  );
}
