"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { initialsOf, isNavActive, navForRole, ROLE_LABELS } from "./nav-config";

interface SidebarProps {
  userRole: string;
  userName: string;
}

// Masaüstü menü; telefonda yerini MobileTopBar çekmecesi ve MobileBottomNav alır
export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-[76px] items-center px-[22px]">
        <Link href="/dashboard" aria-label="Ana sayfa">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pt-3 pr-3.5 pb-4 pl-6">
        {navForRole(userRole).map((group, index) => (
          <div key={group.label ?? index} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-sidebar-foreground/45 uppercase select-none">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative flex h-[38px] items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-bold text-foreground"
                      : "font-semibold text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  {active && <span className="absolute top-[9px] -left-3 h-5 w-[3px] rounded-r bg-primary" />}
                  <item.icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-sidebar-foreground/60")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-3.5 flex items-center gap-2.5 rounded-xl bg-sidebar-accent/70 p-3">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
          {initialsOf(userName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{userName}</p>
          <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[userRole] ?? userRole}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Çıkış yap"
            title="Çıkış yap"
            className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
