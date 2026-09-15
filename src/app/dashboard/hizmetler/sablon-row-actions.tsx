"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Power, PowerOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setHizmetSablonuActive } from "@/app/actions/hizmetler";
import { toast } from "sonner";
import { EditSablonDialog } from "./edit-sablon-dialog";

type Sablon = {
  id: string;
  category: string;
  name: string;
  subCategory: string | null;
  requiredPeople: number | null;
  description: string | null;
  onlineVisibility: string;
  validityDays: number | null;
  isActive: boolean;
  fiyatlar: { zamanBirimi: string; currency: string; price: number }[];
};

export function SablonRowActions({ sablon }: { sablon: Sablon }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive() {
    startTransition(async () => {
      await setHizmetSablonuActive(sablon.id, !sablon.isActive);
      toast.success(sablon.isActive ? "Pasife alındı" : "Aktif edildi");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleActive} disabled={isPending}>
            {sablon.isActive ? (
              <>
                <PowerOff className="w-3.5 h-3.5" /> Pasife Al
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" /> Aktif Et
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditSablonDialog sablon={sablon} open={editOpen} onOpenChange={setEditOpen} showTrigger={false} />
    </>
  );
}
