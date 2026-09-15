import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CalendarDays,
  ConciergeBell,
  House,
  LayoutDashboard,
  Plus,
  Settings,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Waves,
  Wrench,
} from "lucide-react";

export type Role = "ADMIN" | "RECEPTION" | "INSTRUCTOR";

export type NavItem = { label: string; href: string; icon: LucideIcon; roles: Role[] };
export type NavGroup = { label?: string; items: NavItem[] };
export type BottomNavItem = { label: string; href: string; icon: LucideIcon; primary?: boolean };

const ALL: Role[] = ["ADMIN", "RECEPTION", "INSTRUCTOR"];
const STAFF: Role[] = ["ADMIN", "RECEPTION"];

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL },
      { label: "Performansım", href: "/dashboard/performansim", icon: TrendingUp, roles: ["INSTRUCTOR"] },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { label: "Hizmetler", href: "/dashboard/hizmetler", icon: ConciergeBell, roles: STAFF },
      { label: "Müşteriler", href: "/dashboard/musteriler", icon: Users, roles: STAFF },
      { label: "Eğitmenler", href: "/dashboard/egitmenler", icon: UserCheck, roles: STAFF },
      { label: "Performans Özeti", href: "/dashboard/performans-ozeti", icon: BarChart3, roles: STAFF },
    ],
  },
  {
    label: "Planlama",
    items: [
      { label: "Operasyon", href: "/dashboard/operasyon", icon: Waves, roles: STAFF },
      { label: "Bugünkü Derslerim", href: "/dashboard/operasyon", icon: Waves, roles: ["INSTRUCTOR"] },
      { label: "Takvim", href: "/dashboard/takvim", icon: Calendar, roles: STAFF },
      { label: "Rezervasyonlar", href: "/dashboard/rezervasyonlar", icon: CalendarDays, roles: ALL },
    ],
  },
  {
    label: "Finans",
    items: [
      { label: "Satışlar", href: "/dashboard/satislar", icon: ShoppingBag, roles: STAFF },
      { label: "Kasa & Ödemeler", href: "/dashboard/kasa", icon: Wallet, roles: ["ADMIN"] },
      { label: "Raporlar", href: "/dashboard/raporlar", icon: TrendingUp, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Diğer",
    items: [
      { label: "Ekipmanlar", href: "/dashboard/ekipmanlar", icon: Wrench, roles: STAFF },
      { label: "Ayarlar", href: "/dashboard/ayarlar", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

export function navForRole(role: string): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role as Role)),
  })).filter((group) => group.items.length > 0);
}

// Telefonda başparmakla en sık kullanılan ekranlar; gerisi üst menüdeki çekmecede
export function bottomNavForRole(role: string): BottomNavItem[] {
  if (role === "INSTRUCTOR") {
    return [
      { label: "Ana sayfa", href: "/dashboard", icon: House },
      { label: "Performansım", href: "/dashboard/performansim", icon: TrendingUp },
      { label: "Derslerim", href: "/dashboard/operasyon", icon: Waves },
      { label: "Program", href: "/dashboard/rezervasyonlar", icon: CalendarDays },
    ];
  }
  return [
    { label: "Ana sayfa", href: "/dashboard", icon: House },
    { label: "Takvim", href: "/dashboard/takvim", icon: Calendar },
    { label: "Yeni", href: "/dashboard/rezervasyonlar/yeni", icon: Plus, primary: true },
    { label: "Müşteriler", href: "/dashboard/musteriler", icon: Users },
    role === "ADMIN"
      ? { label: "Kasa", href: "/dashboard/kasa", icon: Wallet }
      : { label: "Operasyon", href: "/dashboard/operasyon", icon: Waves },
  ];
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  RECEPTION: "Resepsiyon",
  INSTRUCTOR: "Eğitmen",
};

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR");
}
