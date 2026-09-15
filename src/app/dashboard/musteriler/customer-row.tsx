"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

export function CustomerRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    // Interaktif elemanlar (link, buton vb.) kendi davranışını yönetsin, satır navigasyonuyla çakışmasın.
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea")) return;
    router.push(href);
  };

  return (
    <tr
      onClick={handleClick}
      className={`cursor-pointer hover:bg-muted/40 ${className ?? ""}`}
    >
      {children}
    </tr>
  );
}
