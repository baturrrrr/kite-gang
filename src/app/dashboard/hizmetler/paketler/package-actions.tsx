"use client";

import { deactivatePackage } from "@/app/actions/packages";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditPackageDialog } from "./edit-package-dialog";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  lessonType: string;
  totalHours: number;
  price: number;
  currency: string;
  validityDays: number | null;
};

export function PackageActions({ pkg }: { pkg: Pkg }) {
  async function handleDeactivate() {
    if (!confirm(`"${pkg.name}" paketini pasife almak istediğinize emin misiniz?`)) return;
    await deactivatePackage(pkg.id);
    toast.success("Paket pasife alındı");
  }

  return (
    <div className="flex items-center gap-2">
      <EditPackageDialog pkg={pkg} />
      <button
        onClick={handleDeactivate}
        className="text-muted-foreground/70 hover:text-destructive transition-colors"
        title="Pasife Al"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
