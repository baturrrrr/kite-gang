import { requireAdminOrReception } from "@/lib/auth";
import { StudentForm } from "@/components/students/student-form";
import { createStudent } from "@/app/actions/students";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewStudentPage() {
  await requireAdminOrReception();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/musteriler">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Yeni Müşteri</h1>
      </div>
      <StudentForm action={createStudent} title="Öğrenci Bilgileri" />
    </div>
  );
}
