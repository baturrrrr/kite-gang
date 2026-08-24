import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewReservationForm } from "./new-reservation-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewReservationPage() {
  await requireAdminOrReception();

  const [students, instructors] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.instructor.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/rezervasyonlar">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Yeni Rezervasyon</h1>
      </div>
      <NewReservationForm students={students} instructors={instructors} />
    </div>
  );
}
