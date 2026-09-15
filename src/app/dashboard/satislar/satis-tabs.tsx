"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ShoppingCart } from "lucide-react";

const TABS = [
  { href: "/dashboard/satislar/paketler", label: "Paket ve Üyelik Satışları", icon: Briefcase },
  { href: "/dashboard/satislar/urunler", label: "Ürün Satışları", icon: ShoppingCart },
];

export function SatisTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                active
                  ? "border-border text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground/85"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
