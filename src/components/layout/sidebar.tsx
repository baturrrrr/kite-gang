"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  CalendarDays,
  Wallet,
  TrendingUp,
  Wrench,
  Settings,
  Wind,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ConciergeBell,
  BarChart3,
  ShoppingBag,
  Waves,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION", "INSTRUCTOR"],
      },
      {
        label: "Performansım",
        href: "/dashboard/performansim",
        icon: <TrendingUp className="w-[17px] h-[17px]" />,
        roles: ["INSTRUCTOR"],
      },
    ],
  },
  {
    label: "Yönetim",
    items: [
      {
        label: "Hizmetler",
        href: "/dashboard/hizmetler",
        icon: <ConciergeBell className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
      {
        label: "Müşteriler",
        href: "/dashboard/musteriler",
        icon: <Users className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
      {
        label: "Eğitmenler",
        href: "/dashboard/egitmenler",
        icon: <UserCheck className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
      {
        label: "Performans Özeti",
        href: "/dashboard/performans-ozeti",
        icon: <BarChart3 className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
    ],
  },
  {
    label: "Planlama",
    items: [
      {
        label: "Takvim",
        href: "/dashboard/takvim",
        icon: <Calendar className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
      {
        label: "Bugünkü Derslerim",
        href: "/dashboard/operasyon",
        icon: <Waves className="w-[17px] h-[17px]" />,
        roles: ["INSTRUCTOR"],
      },
      {
        label: "Rezervasyonlar",
        href: "/dashboard/rezervasyonlar",
        icon: <CalendarDays className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION", "INSTRUCTOR"],
      },
    ],
  },
  {
    label: "Finans",
    items: [
      {
        label: "Satışlar",
        href: "/dashboard/satislar",
        icon: <ShoppingBag className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
      {
        label: "Kasa & Ödemeler",
        href: "/dashboard/kasa",
        icon: <Wallet className="w-[17px] h-[17px]" />,
        roles: ["ADMIN"],
      },
      {
        label: "Raporlar",
        href: "/dashboard/raporlar",
        icon: <TrendingUp className="w-[17px] h-[17px]" />,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    label: "Diğer",
    items: [
      {
        label: "Ekipmanlar",
        href: "/dashboard/ekipmanlar",
        icon: <Wrench className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION"],
      },
      {
        label: "Ayarlar",
        href: "/dashboard/ayarlar",
        icon: <Settings className="w-[17px] h-[17px]" />,
        roles: ["ADMIN"],
      },
    ],
  },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen flex-shrink-0 bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[228px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-sidebar-border px-4 gap-2.5",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Wind className="w-[17px] h-[17px] text-white" />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-heading font-semibold text-white truncate leading-tight tracking-tight">Kite Gang</p>
              <p className="text-[10px] text-sidebar-primary font-medium uppercase tracking-[0.16em] leading-tight">Corner</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/5 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-[22px] w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-primary transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5">
        {navGroups.map((group, gi) => {
          const visible = group.items.filter((item) => item.roles.includes(userRole));
          if (!visible.length) return null;

          return (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {!collapsed && group.label && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest select-none">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
                        collapsed
                          ? "justify-center w-10 h-9 mx-auto"
                          : "px-2.5 py-2",
                        isActive
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/55 hover:text-white hover:bg-sidebar-accent/60"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-coral" />
                      )}
                      <span className={cn("flex-shrink-0", isActive && "text-sidebar-primary")}>{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-sidebar-border p-2.5">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-0.5">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-sidebar-foreground/85 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-sidebar-foreground/40 leading-tight">
                {userRole === "ADMIN" ? "Admin" : userRole === "RECEPTION" ? "Resepsiyon" : "Eğitmen"}
              </p>
            </div>
          </div>
        )}

        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? "Çıkış Yap" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md text-[12px] font-medium text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full",
              collapsed ? "justify-center w-10 h-9 mx-auto" : "px-2.5 py-2"
            )}
          >
            <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
            {!collapsed && <span>Çıkış Yap</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
