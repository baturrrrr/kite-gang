"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Sitedeki tüm form panelleri bu bileşeni kullanır: sağdan açılan, tam boy,
// başlığı sabit kalan panel. Tek bir yerden düzenlensin diye burada toplandı;
// ayrı ayrı Dialog/Sheet kurulumu yapılmamalı.

const SIZES = {
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
} as const;

export type FormSheetSize = keyof typeof SIZES;

export function FormSheet({
  open,
  onOpenChange,
  trigger,
  icon: Icon,
  title,
  description,
  size = "md",
  className,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: FormSheetSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger render={trigger as React.ReactElement} /> : null}
      <SheetContent
        side="right"
        className={cn("w-full gap-0 overflow-y-auto", SIZES[size], className)}
      >
        <SheetHeader className="sticky top-0 z-10 shrink-0 border-b bg-popover">
          <SheetTitle className="flex items-center gap-2 pr-8 text-base">
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            {title}
          </SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="px-4 py-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

// Panel içindeki bölüm başlığı — "KİŞİSEL BİLGİLER" gibi.
export function FormSheetSection({
  title,
  className,
  children,
}: {
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <p className="font-heading text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {title}
        </p>
      ) : null}
      {children}
    </section>
  );
}

// Panelin altına yapışan aksiyon satırı.
export function FormSheetActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 flex justify-end gap-2 border-t bg-popover px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}
