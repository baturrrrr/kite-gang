"use client";

import { useState } from "react";
import { FormSheet } from "@/components/ui/form-sheet";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { StudentForm } from "@/components/students/student-form";
import { createStudent } from "@/app/actions/students";

export function NewStudentSheet() {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      icon={UserPlus}
      title="Müşteri Ekle"
      trigger={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Müşteri
        </Button>
      }
    >
      <StudentForm action={createStudent} onCancel={() => setOpen(false)} />
    </FormSheet>
  );
}
