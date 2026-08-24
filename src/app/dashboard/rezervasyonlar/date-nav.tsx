"use client";

import { useRouter } from "next/navigation";

export function DateNav({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  const prev = new Date(currentDate);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(currentDate);
  next.setDate(next.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push(`/dashboard/rezervasyonlar?date=${fmt(prev)}`)}
        className="border rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        ←
      </button>
      <input
        type="date"
        value={currentDate}
        onChange={(e) => router.push(`/dashboard/rezervasyonlar?date=${e.target.value}`)}
        className="border rounded-md px-3 py-1.5 text-sm"
      />
      <button
        onClick={() => router.push(`/dashboard/rezervasyonlar?date=${fmt(next)}`)}
        className="border rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        →
      </button>
    </div>
  );
}
