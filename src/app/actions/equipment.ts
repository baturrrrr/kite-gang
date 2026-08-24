"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const equipmentSchema = z.object({
  type: z.enum(["KITE", "BOARD", "HARNESS", "WETSUIT", "BAR", "OTHER"]),
  name: z.string().min(1, "Ad zorunlu"),
  brand: z.string().optional(),
  size: z.string().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "REPAIR", "RETIRED"]).default("AVAILABLE"),
  notes: z.string().optional(),
});

export type EquipmentFormState = { error?: string };

export async function createEquipment(
  _prev: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  await requireAdminOrReception();

  const raw = {
    type: formData.get("type") as string,
    name: formData.get("name") as string,
    brand: formData.get("brand") as string,
    size: formData.get("size") as string,
    status: formData.get("status") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = equipmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.equipment.create({
    data: {
      ...parsed.data,
      brand: parsed.data.brand || null,
      size: parsed.data.size || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard/ekipmanlar");
  return {};
}

const VALID_EQUIPMENT_STATUSES = ["AVAILABLE", "IN_USE", "REPAIR", "RETIRED"] as const;

export async function updateEquipmentStatus(id: string, status: string) {
  await requireAdminOrReception();

  if (!(VALID_EQUIPMENT_STATUSES as readonly string[]).includes(status)) {
    return { error: "Geçersiz ekipman durumu" };
  }

  await prisma.equipment.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/ekipmanlar");
}
