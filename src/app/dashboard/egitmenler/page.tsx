import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Phone, Mail } from "lucide-react";
import { PAYMENT_MODELS } from "@/lib/constants";
import { AddDersDialog } from "./add-ders-dialog";
import { EgitmenlerExportButton } from "./export-button";
import { toTRY, formatTL } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

export default async function InstructorsPage() {
  const user = await requireAuth();

  // INSTRUCTOR listeye erişemez; kendi verisini eğitmen portalında görür
  if (user.role === "INSTRUCTOR") redirect("/dashboard/performansim");

  const [instructors, egitimSablonlar, students] = await Promise.all([
    prisma.instructor.findMany({
      where: { isActive: true },
      include: {
        user: true,
        _count: {
          select: {
            lessons: true,
            earnings: { where: { isPaid: false } },
          },
        },
        earnings: {
          where: { isPaid: false },
          select: { amount: true, currency: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.hizmetSablonu.findMany({
      where: { category: "EGITIM", isActive: true },
      include: { fiyatlar: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const rates = await getExchangeRates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl leading-[0.95] font-extrabold lg:text-[56px]">Eğitmenler</h1>
          <p className="text-muted-foreground text-sm mt-1">{instructors.length} aktif eğitmen</p>
        </div>
        {user.role === "ADMIN" && (
          <div className="flex items-center gap-2">
            <EgitmenlerExportButton
              instructors={instructors.map((i) => ({ id: i.id, name: i.user.name }))}
            />
            <Link href="/dashboard/egitmenler/yeni">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Eğitmen
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instructors.map((instructor) => {
          const pendingBalance = instructor.earnings.reduce(
            (sum, e) => sum + toTRY(e.amount, e.currency, rates),
            0
          );

          return (
            <Card key={instructor.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ backgroundColor: instructor.color }}
                  >
                    {instructor.user.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{instructor.user.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_MODELS[instructor.paymentModel as keyof typeof PAYMENT_MODELS]}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {instructor.user.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {instructor.user.email}
                  </div>
                )}
                {instructor.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {instructor.phone}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">{instructor._count.lessons} ders</span>
                  {user.role === "ADMIN" && pendingBalance > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Bekleyen: {formatTL(pendingBalance)}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-1">
                  <Link href={`/dashboard/egitmenler/${instructor.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Görüntüle
                    </Button>
                  </Link>
                  {egitimSablonlar.length > 0 && (
                    <AddDersDialog
                      instructorId={instructor.id}
                      instructorName={instructor.user.name}
                      hourlyRate={instructor.hourlyRate}
                      hourlyRateCurrency={instructor.hourlyRateCurrency}
                      sablonlar={egitimSablonlar}
                      students={students}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
