import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EQUIPMENT_TYPES } from "@/lib/constants";
import { NewEquipmentForm } from "./new-equipment-form";
import { EditEquipmentDialog } from "./edit-equipment-dialog";

export default async function EquipmentPage() {
  const user = await requireAdminOrReception();

  const equipment = await prisma.equipment.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const byType: Record<string, typeof equipment> = {};
  for (const e of equipment) {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ekipman Envanteri</h1>
          <p className="text-gray-500 text-sm mt-1">{equipment.length} ekipman</p>
        </div>
        {user.role !== "INSTRUCTOR" && <NewEquipmentForm />}
      </div>

      {Object.entries(byType).map(([type, items]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-base">
              {EQUIPMENT_TYPES[type as keyof typeof EQUIPMENT_TYPES]} ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Marka</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Model</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Boyut</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Adet</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Notlar</th>
                    {user.role !== "INSTRUCTOR" && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-gray-500">{item.brand ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{item.size ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{item.quantity}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{item.notes ?? "—"}</td>
                      {user.role !== "INSTRUCTOR" && (
                        <td className="px-3 py-2 text-right">
                          <EditEquipmentDialog equipment={item} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {equipment.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>Henüz ekipman eklenmemiş</p>
        </div>
      )}
    </div>
  );
}
