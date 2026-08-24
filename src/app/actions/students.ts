"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const studentSchema = z.object({
  firstName: z.string().min(1, "Ad zorunlu"),
  lastName: z.string().min(1, "Soyad zorunlu"),
  email: z.string().email("Geçerli email").optional().or(z.literal("")),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  language: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "INDEPENDENT"]),
  notes: z.string().optional(),
  waiverSigned: z.coerce.boolean().optional(),
});

export type StudentFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const user = await requireAdminOrReception();

  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    nationality: formData.get("nationality") as string,
    language: formData.get("language") as string,
    emergencyContact: formData.get("emergencyContact") as string,
    emergencyPhone: formData.get("emergencyPhone") as string,
    skillLevel: formData.get("skillLevel") as string,
    notes: formData.get("notes") as string,
    waiverSigned: formData.get("waiverSigned") === "on",
  };

  const parsed = studentSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const student = await prisma.student.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      waiverSignedAt: parsed.data.waiverSigned ? new Date() : null,
    },
  });

  await logAudit({
    userId: user.userId,
    action: "CREATE",
    entity: "Student",
    entityId: student.id,
    newValues: parsed.data,
  });

  revalidatePath("/dashboard/musteriler");
  redirect(`/dashboard/musteriler/${student.id}`);
}

export async function updateStudent(
  id: string,
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const user = await requireAdminOrReception();

  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    nationality: formData.get("nationality") as string,
    language: formData.get("language") as string,
    emergencyContact: formData.get("emergencyContact") as string,
    emergencyPhone: formData.get("emergencyPhone") as string,
    skillLevel: formData.get("skillLevel") as string,
    notes: formData.get("notes") as string,
    waiverSigned: formData.get("waiverSigned") === "on",
  };

  const parsed = studentSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) return { error: "Öğrenci bulunamadı" };

  await prisma.student.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      waiverSignedAt:
        parsed.data.waiverSigned && !existing.waiverSigned ? new Date() : existing.waiverSignedAt,
    },
  });

  await logAudit({
    userId: user.userId,
    action: "UPDATE",
    entity: "Student",
    entityId: id,
    newValues: parsed.data,
  });

  revalidatePath(`/dashboard/musteriler/${id}`);
  revalidatePath("/dashboard/musteriler");
  return {};
}

export async function deactivateStudent(id: string) {
  const user = await requireAdminOrReception();
  await prisma.student.update({ where: { id }, data: { isActive: false } });
  await logAudit({ userId: user.userId, action: "DEACTIVATE", entity: "Student", entityId: id });
  revalidatePath("/dashboard/musteriler");
  redirect("/dashboard/musteriler");
}
