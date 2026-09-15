import { Wind } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-8 rounded-lg", icon: "size-[18px]", word: "text-[17px]", tag: "text-[8px]" },
  md: { box: "size-9 rounded-lg", icon: "size-5", word: "text-xl", tag: "text-[9px]" },
  lg: { box: "size-14 rounded-xl", icon: "size-8", word: "text-4xl", tag: "text-xs" },
};

export function Logo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("flex shrink-0 items-center justify-center bg-primary text-primary-foreground", s.box)}>
        <Wind className={s.icon} strokeWidth={2.4} />
      </div>
      <div className="flex flex-col leading-none">
        {/* lang="en": Türkçe büyük harf kuralı marka adını "KİTE" yapmasın */}
        <span lang="en" className={cn("font-heading font-extrabold tracking-wide text-foreground uppercase", s.word)}>
          Kite Gang
        </span>
        <span className={cn("mt-1 font-extrabold tracking-[0.34em] text-primary", s.tag)}>CORNER</span>
      </div>
    </div>
  );
}
