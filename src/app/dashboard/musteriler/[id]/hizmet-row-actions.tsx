"use client";

import { updateHizmetStatus, deleteHizmet } from "@/app/actions/hizmetler";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function HizmetRowActions({ id, studentId, status }: { id: string; studentId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const next =
    status === "BEKLIYOR" ? "DEVAM"
    : status === "DEVAM" ? "TAMAMLANDI"
    : null;

  const nextLabel =
    status === "BEKLIYOR" ? "Başlat"
    : status === "DEVAM" ? "Tamamla"
    : null;

  function advance() {
    if (!next) return;
    startTransition(async () => {
      await updateHizmetStatus(id, studentId, next as any);
      router.refresh();
      toast.success(next === "DEVAM" ? "Başlatıldı" : "Tamamlandı");
    });
  }

  function cancel() {
    startTransition(async () => {
      await deleteHizmet(id, studentId);
      router.refresh();
      toast.success("İptal edildi");
    });
  }

  return (
    <div className="flex items-center gap-1">
      {nextLabel && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={advance}>
          {isPending ? "..." : nextLabel}
        </Button>
      )}
      {status !== "TAMAMLANDI" && status !== "IPTAL" && (
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50" disabled={isPending} onClick={cancel}>
          İptal
        </Button>
      )}
    </div>
  );
}
