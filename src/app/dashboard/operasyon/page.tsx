import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckInButton } from "./checkin-button";
import { CheckOutDialog } from "./checkout-dialog";
import { NoShowButton } from "./no-show-button";
import { LESSON_TYPES } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, GraduationCap, Package, Waves, Wind } from "lucide-react";
import { getWindConditions } from "@/lib/weather";
import { PageHeader } from "@/components/layout/page-header";
import { Pill, ReservationStatusPill } from "@/components/layout/pill";
import { windSuitability } from "@/components/weather/wind-card";
import { cn } from "@/lib/utils";

export default async function OperationPage() {
  const user = await requireAuth();
  const isInstructor = user.role === "INSTRUCTOR";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [reservations, wind] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
        isActive: true,
        status: { not: "CANCELLED" },
        ...(isInstructor ? { instructor: { userId: user.userId } } : {}),
      },
      include: {
        student: {
          include: {
            packagePurchases: {
              where: { isActive: true },
              select: { id: true, remainingHours: true, package: { select: { name: true } }, currency: true },
              // Check-in ve no-show, saati kalmış en eski paketi kullanır (bkz. actions/reservations.ts)
              orderBy: { purchasedAt: "asc" },
            },
          },
        },
        instructor: { include: { user: { select: { name: true } } } },
        lesson: true,
      },
      orderBy: { startTime: "asc" },
    }),
    getWindConditions(),
  ]);

  const planned = reservations.filter((r) => r.status === "PLANNED");
  const checkedIn = reservations.filter((r) => r.status === "CHECKED_IN");
  const completed = reservations.filter((r) => r.status === "COMPLETED");
  const noShows = reservations.filter((r) => r.status === "NO_SHOW");
  // Gelmedi işaretlemek paket saati düşürür; eğitmen değil resepsiyon karar verir
  const canMarkNoShow = !isInstructor;

  const card = (res: (typeof reservations)[number], mode: "checkin" | "checkout" | "done") => {
    const studentName = `${res.student.firstName} ${res.student.lastName}`;
    const activePurchase = res.student.packagePurchases.find((p) => p.remainingHours > 0);
    const remaining = res.student.packagePurchases.reduce((sum, p) => sum + p.remainingHours, 0);
    const isRental = res.lessonType === "EQUIPMENT_RENTAL";

    return (
      <div
        key={res.id}
        className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", mode === "done" && "opacity-70")}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="num text-[26px] leading-none font-bold">{format(res.startTime, "HH:mm")}</span>
            <span className="num text-[15px] text-muted-foreground/70">– {format(res.endTime, "HH:mm")}</span>
          </div>
          <ReservationStatusPill status={res.status} />
        </div>

        <div className="space-y-1.5">
          <p className="text-lg font-extrabold">{studentName}</p>
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <GraduationCap className="size-[15px] text-muted-foreground/70" />
            {LESSON_TYPES[res.lessonType as keyof typeof LESSON_TYPES] ?? res.lessonType}
            {(res.lesson?.kiteSize || res.lesson?.boardType) && (
              <span className="text-muted-foreground/70">· {[res.lesson?.kiteSize, res.lesson?.boardType].filter(Boolean).join(" · ")}</span>
            )}
          </p>
          {!isInstructor && (
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="flex w-[15px] justify-center">
                <span className="size-2 rounded-full" style={{ backgroundColor: res.instructor?.color ?? "#5c646e" }} />
              </span>
              {res.instructor?.user.name ?? "Eğitmen atanmadı"}
            </p>
          )}
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Package className="size-[15px] text-muted-foreground/70" />
            {isRental
              ? "Ekipman kiralaması"
              : activePurchase
                ? `Kalan ${remaining.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sa · ${activePurchase.package.name}`
                : "Paket yok"}
          </p>
        </div>

        {mode === "checkin" && (
          <div className="flex gap-2">
            <CheckInButton
              reservationId={res.id}
              purchaseId={activePurchase?.id}
              plannedHours={res.plannedHours}
              className="flex-[1.4]"
            />
            {canMarkNoShow && (
              <NoShowButton
                reservationId={res.id}
                studentName={studentName}
                plannedHours={res.plannedHours}
                isRental={isRental}
                packageName={activePurchase?.package.name}
                remainingHours={activePurchase?.remainingHours}
                className="flex-1"
              />
            )}
          </div>
        )}
        {mode === "checkout" && res.lesson && (
          <CheckOutDialog lessonId={res.lesson.id} studentName={studentName} plannedHours={res.plannedHours} />
        )}
      </div>
    );
  };

  const section = (title: string, items: typeof reservations, mode: "checkin" | "checkout" | "done", icon?: React.ReactNode) =>
    items.length > 0 && (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[22px] font-extrabold">
          {icon}
          {title}
          <span className="num text-lg font-bold text-muted-foreground/70">{items.length}</span>
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((res) => card(res, mode))}</div>
      </section>
    );

  const counts = [
    { label: "Planlandı", value: planned.length, tone: "" },
    { label: "Suda", value: checkedIn.length, tone: "text-info" },
    { label: "Tamamlandı", value: completed.length, tone: "" },
    ...(noShows.length > 0 ? [{ label: "Gelmedi", value: noShows.length, tone: "text-destructive" }] : []),
  ];

  const suitability = wind ? windSuitability(wind.windSpeedKn) : null;

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        eyebrow={format(today, "d MMMM yyyy · EEEE", { locale: tr })}
        title={isInstructor ? "Bugünkü derslerim" : "Operasyon"}
        actions={
          wind &&
          suitability && (
            <>
              <Pill tone={suitability.tone} className="h-[30px] px-3 text-[13px]">
                <Wind className="size-[15px]!" />
                {Math.round(wind.windSpeedKn)} kn · {suitability.label}
              </Pill>
              <Pill className="h-[30px] px-3 text-[13px]">
                {wind.windDirectionLabel} · {Math.round(wind.windGustKn)} kn hamle
              </Pill>
            </>
          )
        }
      />

      <div className="flex gap-1 rounded-xl border border-border bg-card p-1.5 lg:max-w-2xl">
        {counts.map((count) => (
          <div
            key={count.label}
            className={cn("flex flex-1 flex-col gap-1 rounded-lg px-3 py-2.5", count.tone === "text-info" && count.value > 0 && "bg-muted")}
          >
            <span className={cn("num text-[26px] leading-none font-bold", count.value > 0 && count.tone)}>{count.value}</span>
            <span className="text-[11px] font-bold text-muted-foreground">{count.label}</span>
          </div>
        ))}
      </div>

      {reservations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
          <Clock className="size-8 text-muted-foreground/50" />
          <p className="text-base font-semibold text-muted-foreground">Bugün için planlanmış ders yok</p>
        </div>
      ) : (
        <>
          {section("Şu an suda", checkedIn, "checkout", <Waves className="size-5 text-info" />)}
          {section("Planlandı", planned, "checkin")}
          {section("Tamamlandı", completed, "done")}
          {section("Gelmedi", noShows, "done")}
        </>
      )}
    </div>
  );
}
