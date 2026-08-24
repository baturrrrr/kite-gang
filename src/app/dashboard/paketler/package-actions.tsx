"use client";

import { deactivatePackage } from "@/app/actions/packages";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function PackageActions({ pkg }: { pkg: { id: string; name: string } }) {
  async function handleDeactivate() {
    if (!confirm(`"${pkg.name}" paketini pasife almak istediğinize emin misiniz?`)) return;
    await deactivatePackage(pkg.id);
    toast.success("Paket pasife alındı");
  }

  return (
    <button
      onClick={handleDeactivate}
      className="text-gray-400 hover:text-red-500 transition-colors"
      title="Pasife Al"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
