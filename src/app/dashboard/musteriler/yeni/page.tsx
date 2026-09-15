import { requireAdminOrReception } from "@/lib/auth";
import { StudentForm } from "@/components/students/student-form";
import { createStudent } from "@/app/actions/students";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UserPlus } from "lucide-react";

export default async function NewStudentPage() {
  await requireAdminOrReception();

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/musteriler">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-4.5 h-4.5 text-foreground/85" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Müşteri Ekle</h1>
      </div>
      <StudentForm action={createStudent} />
    </div>
  );
}
