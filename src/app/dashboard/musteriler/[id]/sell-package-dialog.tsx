"use client";

export function SellPackageDialog({ studentId }: { studentId: string }) {
  return (
    <a
      href={`/dashboard/musteriler/${studentId}/paket-sat`}
      className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
    >
      + Paket Sat
    </a>
  );
}
