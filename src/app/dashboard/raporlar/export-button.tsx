"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  const handleExport = () => {
    const params = new URLSearchParams(window.location.search);
    window.open(`/api/export/rapor?${params.toString()}`, "_blank");
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      CSV İndir
    </Button>
  );
}
