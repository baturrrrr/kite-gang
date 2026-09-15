import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckInButton } from "./checkin-button";
import { CheckOutDialog } from "./checkout-dialog";
import { NoShowButton } from "./no-show-button";
import { STATUS_COLORS, LESSON_TYPES, RESERVATION_STATUSES, CURRENCY_SYMBOLS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Users, Waves, CheckCircle2, Clock } from "lucide-react";

export default async function OperationPage() {
  const user = await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      startTime: { gte: today, lt: tomorrow },
      isActive: true,
      status: { not: "CANCELLED" },
      ...(user.role === "INSTRUCTOR"
        ? { instructor: { userId: user.userId } }
        : {}),
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
  });

  const planned = reservations.filter((r) => r.status === "PLANNED");
  const checkedIn = reservations.filter((r) => r.status === "CHECKED_IN");
  const completed = reservations.filter((r) => r.status === "COMPLETED");
  const noShows = reservations.filter((r) => r.status === "NO_SHOW");
  const canMarkNoShow = user.role !== "INSTRUCTOR";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Günlük Operasyon</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-info/30 bg-info/10">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-info" />
              <span className="text-sm text-info font-medium">Planlandı</span>
            </div>
            <p className="text-3xl font-bold text-info mt-1">{planned.length}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning font-medium">Suda</span>
            </div>
            <p className="text-3xl font-bold text-warning mt-1">{checkedIn.length}</p>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/10">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">Tamamlandı</span>
            </div>
            <p className="text-3xl font-bold text-success mt-1">{completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Toplam</span>
            </div>
            <p className="text-3xl font-bold text-foreground mt-1">{reservations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Checked In - Most Important */}
      {checkedIn.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Waves className="w-5 h-5 text-warning" />
            Şu An Suda ({checkedIn.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {checkedIn.map((res) => (
              <ReservationCard key={res.id} res={res} showCheckOut />
            ))}
          </div>
        </div>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Planlandı ({planned.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {planned.map((res) => (
              <ReservationCard key={res.id} res={res} showCheckIn showNoShow={canMarkNoShow} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 text-muted-foreground">Tamamlandı ({completed.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
            {completed.map((res) => (
              <ReservationCard key={res.id} res={res} />
            ))}
          </div>
        </div>
      )}

      {/* No-show */}
      {noShows.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Gelmedi ({noShows.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
            {noShows.map((res) => (
              <ReservationCard key={res.id} res={res} />
            ))}
          </div>
        </div>
      )}

      {reservations.length === 0 && (
        <div className="text-center py-16 text-muted-foreground/70">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Bugün için planlanmış ders yok</p>
        </div>
      )}
    </div>
  );
}

function ReservationCard({
  res,
  showCheckIn,
  showCheckOut,
  showNoShow,
}: {
  res: any;
  showCheckIn?: boolean;
  showCheckOut?: boolean;
  showNoShow?: boolean;
}) {
  const totalHours = res.student.packagePurchases.reduce(
    (sum: number, p: any) => sum + p.remainingHours,
    0
  );
  const activePurchase = res.student.packagePurchases.find((p: any) => p.remainingHours > 0);

  return (
    <Card className="border">
      <CardContent className="pt-4 pb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: res.instructor?.color ?? "#9CA3AF" }}
              />
              <p className="font-semibold text-foreground">
                {res.student.firstName} {res.student.lastName}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-4">
              {res.instructor?.user.name ?? "Personel atanmadı"}
            </p>
          </div>
          <Badge className={STATUS_COLORS[res.status]}>
            {RESERVATION_STATUSES[res.status as keyof typeof RESERVATION_STATUSES]}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            🕐 {format(new Date(res.startTime), "HH:mm")} - {format(new Date(res.endTime), "HH:mm")}
            {" · "}
            {LESSON_TYPES[res.lessonType as keyof typeof LESSON_TYPES]}
          </p>
          {res.lesson?.kiteSize && (
            <p>🪁 {res.lesson.kiteSize}</p>
          )}
          {res.lesson?.boardType && (
            <p>🏄 {res.lesson.boardType}</p>
          )}
          <p>
            ⏱ Kalan: {totalHours.toFixed(1)} saat
            {activePurchase && ` (${activePurchase.package.name})`}
          </p>
        </div>

        {showCheckIn && (
          <div className="mt-3 space-y-2">
            <CheckInButton
              reservationId={res.id}
              purchaseId={activePurchase?.id}
              plannedHours={res.plannedHours}
            />
            {showNoShow && (
              <NoShowButton
                reservationId={res.id}
                studentName={`${res.student.firstName} ${res.student.lastName}`}
                plannedHours={res.plannedHours}
                isRental={res.lessonType === "EQUIPMENT_RENTAL"}
                packageName={activePurchase?.package.name}
                remainingHours={activePurchase?.remainingHours}
              />
            )}
          </div>
        )}

        {showCheckOut && res.lesson && (
          <div className="mt-3">
            <CheckOutDialog
              lessonId={res.lesson.id}
              studentName={`${res.student.firstName} ${res.student.lastName}`}
              plannedHours={res.plannedHours}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
