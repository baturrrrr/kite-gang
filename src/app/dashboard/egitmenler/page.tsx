import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, UserCheck, Phone, Mail } from "lucide-react";
import { PAYMENT_MODELS, CURRENCY_SYMBOLS } from "@/lib/constants";

export default async function InstructorsPage() {
  const user = await requireAuth();

  // INSTRUCTOR kendi profil sayfasına yönlendirilir, listeye erişemez
  if (user.role === "INSTRUCTOR") {
    if (user.instructorId) {
      redirect(`/dashboard/egitmenler/${user.instructorId}`);
    } else {
      redirect("/dashboard");
    }
  }

  const instructors = await prisma.instructor.findMany({
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
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eğitmenler</h1>
          <p className="text-gray-500 text-sm mt-1">{instructors.length} aktif eğitmen</p>
        </div>
        {user.role === "ADMIN" && (
          <Link href="/dashboard/egitmenler/yeni">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Eğitmen
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instructors.map((instructor) => {
          const pendingBalance = instructor.earnings.reduce(
            (sum, e) => sum + e.amount,
            0
          );
          const currency = instructor.earnings[0]?.currency ?? instructor.hourlyRateCurrency ?? "EUR";
          const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;

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
                    <p className="text-xs text-gray-500">
                      {PAYMENT_MODELS[instructor.paymentModel as keyof typeof PAYMENT_MODELS]}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {instructor.user.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5" /> {instructor.user.email}
                  </div>
                )}
                {instructor.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5" /> {instructor.phone}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-gray-500">{instructor._count.lessons} ders</span>
                  {user.role === "ADMIN" && pendingBalance > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Bekleyen: {symbol}{pendingBalance.toFixed(2)}
                    </Badge>
                  )}
                </div>
                <Link href={`/dashboard/egitmenler/${instructor.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    Görüntüle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
