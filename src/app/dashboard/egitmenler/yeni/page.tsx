import { requireAdmin } from "@/lib/auth";
import { InstructorForm } from "@/components/instructors/instructor-form";
import { createInstructor } from "@/app/actions/instructors";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function NewInstructorPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/egitmenler">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Yeni Eğitmen</h1>
      </div>
      <InstructorForm action={createInstructor} title="Eğitmen Bilgileri" isNew />
    </div>
  );
}
