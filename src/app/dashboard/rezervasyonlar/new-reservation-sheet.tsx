"use client";

import { useState } from "react";
import { FormSheet } from "@/components/ui/form-sheet";
import { Button } from "@/components/ui/button";
import { Plus, CalendarPlus } from "lucide-react";
import { NewReservationForm } from "./yeni/new-reservation-form";

interface NewReservationSheetProps {
  students: { id: string; firstName: string; lastName: string }[];
  instructors: { id: string; color: string; user: { name: string } }[];
  equipment: { id: string; type: string; name: string; size: string | null }[];
}

export function NewReservationSheet({ students, instructors, equipment }: NewReservationSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      icon={CalendarPlus}
      title="Rezervasyon Ekle"
      trigger={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Rezervasyon
        </Button>
      }
    >
      <NewReservationForm
        students={students}
        instructors={instructors}
        equipment={equipment}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
