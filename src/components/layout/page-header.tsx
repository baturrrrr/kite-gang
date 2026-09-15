import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  count?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

// Tüm sayfalarda aynı başlık: yeşil işaretli küçük etiket + büyük dar başlık + sağda aksiyonlar
export function PageHeader({ eyebrow, title, count, description, actions, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-[2px] bg-primary" />
            <span className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">{eyebrow}</span>
          </div>
        )}
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl leading-[0.95] font-extrabold lg:text-[56px]">{title}</h1>
          {count !== undefined && (
            <span className="num text-2xl font-bold text-muted-foreground/70 lg:text-3xl">{count}</span>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
