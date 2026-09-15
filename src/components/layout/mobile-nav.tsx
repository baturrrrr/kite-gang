"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { bottomNavForRole, initialsOf, isNavActive, navForRole, ROLE_LABELS } from "./nav-config";

type Props = { userRole: string; userName: string };

export function MobileTopBar({ userRole, userName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-sidebar-border bg-background/90 px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Menüyü aç"
          className="flex size-11 items-center justify-center rounded-lg border border-input bg-card text-foreground"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[86%] max-w-xs gap-0 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <div className="flex h-16 items-center px-5">
            <Logo size="sm" />
          </div>
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-2 pb-4">
            {navForRole(userRole).map((group, index) => (
              <div key={group.label ?? index} className="space-y-0.5">
                {group.label && (
                  <p className="px-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-sidebar-foreground/50 uppercase">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold",
                        active ? "bg-sidebar-accent text-foreground" : "text-sidebar-foreground"
                      )}
                    >
                      <item.icon className={cn("size-5", active ? "text-primary" : "text-sidebar-foreground/70")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
              {initialsOf(userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{userName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[userRole] ?? userRole}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Çıkış yap"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" aria-label="Ana sayfa">
        <Logo size="sm" />
      </Link>

      <div className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
        {initialsOf(userName)}
      </div>
    </header>
  );
}

export function MobileBottomNav({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hızlı gezinme"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-sidebar-border bg-sidebar px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:hidden"
    >
      {bottomNavForRole(userRole).map((item) => {
        if (item.primary) {
          return (
            <div key={item.href} className="flex flex-1 justify-center">
              <Link
                href={item.href}
                aria-label={item.label}
                className="-mt-5 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_5px_var(--sidebar)]"
              >
                <item.icon className="size-6" strokeWidth={2.6} />
              </Link>
            </div>
          );
        }
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-1",
              active ? "text-primary" : "text-sidebar-foreground/70"
            )}
          >
            <item.icon className="size-[22px]" />
            <span className={cn("text-[10px]", active ? "font-extrabold" : "font-semibold")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
