import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } from "@/lib/constants";
import { NewEquipmentForm } from "./new-equipment-form";

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  IN_USE: "bg-yellow-100 text-yellow-800",
  REPAIR: "bg-orange-100 text-orange-800",
  RETIRED: "bg-gray-100 text-gray-600",
};

export default async function EquipmentPage() {
  const user = await requireAuth();

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

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["AVAILABLE", "IN_USE", "REPAIR", "RETIRED"].map((status) => {
          const count = equipment.filter((e) => e.status === status).length;
          return (
            <Card key={status}>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-gray-500 mb-1">
                  {EQUIPMENT_STATUSES[status as keyof typeof EQUIPMENT_STATUSES]}
                </p>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Equipment by Type */}
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
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Ad</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Marka</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Boyut</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Durum</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Notlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-gray-500">{item.brand ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{item.size ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge className={STATUS_BADGE[item.status]}>
                          {EQUIPMENT_STATUSES[item.status as keyof typeof EQUIPMENT_STATUSES]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{item.notes ?? "—"}</td>
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
