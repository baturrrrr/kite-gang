"use client";

export function SellPackageDialog({ studentId }: { studentId: string }) {
  return (
    <a
      href={`/dashboard/musteriler/${studentId}/paket-sat`}
      className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md text-info border-info/30 hover:bg-info/10 transition-colors"
    >
      + Paket Sat
    </a>
  );
}
