"use client";

import { updateInstructor } from "@/app/actions/instructors";
import { InstructorForm } from "@/components/instructors/instructor-form";

export function InstructorEditForm({ instructor }: { instructor: any }) {
  const boundAction = updateInstructor.bind(null, instructor.id);
  return <InstructorForm action={boundAction} instructor={instructor} title="Bilgileri Düzenle" />;
}
