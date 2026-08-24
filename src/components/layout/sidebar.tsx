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
  CheckSquare,
  Wallet,
  TrendingUp,
  Wrench,
  Settings,
  Wind,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ConciergeBell,
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
        label: "Rezervasyonlar",
        href: "/dashboard/rezervasyonlar",
        icon: <CalendarDays className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION", "INSTRUCTOR"],
      },
      {
        label: "Günlük Operasyon",
        href: "/dashboard/operasyon",
        icon: <CheckSquare className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "RECEPTION", "INSTRUCTOR"],
      },
    ],
  },
  {
    label: "Finans",
    items: [
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
        "flex flex-col h-screen flex-shrink-0 bg-slate-900 transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-white/[0.08] px-3 gap-2.5",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Wind className="w-[17px] h-[17px] text-white" />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-tight">Kite Gang</p>
              <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest leading-tight">Corner</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-[18px] w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group, gi) => {
          const visible = group.items.filter((item) => item.roles.includes(userRole));
          if (!visible.length) return null;

          return (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {!collapsed && group.label && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest select-none">
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
                        "flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
                        collapsed
                          ? "justify-center w-10 h-9 mx-auto"
                          : "px-2.5 py-2",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
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
      <div className="border-t border-white/[0.08] p-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-0.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-300 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">
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
              "flex items-center gap-2 rounded-md text-[12px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full",
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
