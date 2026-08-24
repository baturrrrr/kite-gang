import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SellPackageForm } from "./sell-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function SellPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrReception();
  const { id } = await params;

  const [student, packages, cashAccounts] = await Promise.all([
    prisma.student.findUnique({ where: { id, isActive: true } }),
    prisma.lessonPackage.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.cashAccount.findMany({ where: { isActive: true } }),
  ]);

  if (!student) notFound();

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/musteriler/${id}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          Paket Sat — {student.firstName} {student.lastName}
        </h1>
      </div>
      <SellPackageForm
        studentId={id}
        packages={packages}
        cashAccounts={cashAccounts}
      />
    </div>
  );
}
