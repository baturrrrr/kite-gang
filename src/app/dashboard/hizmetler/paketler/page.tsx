import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { LESSON_TYPES } from "@/lib/constants";
import { PackageActions } from "./package-actions";
import { NewPackageForm } from "./new-package-form";
import { formatTRY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

export default async function PaketlerPage() {
  const user = await requireAdminOrReception();

  const [packages, rates] = await Promise.all([
    prisma.lessonPackage.findMany({
      where: { isActive: true },
      include: { _count: { select: { purchases: true } } },
      orderBy: { name: "asc" },
    }),
    getExchangeRates(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{packages.length} aktif paket</p>
        {user.role === "ADMIN" && <NewPackageForm />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          return (
            <Card key={pkg.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base leading-tight">{pkg.name}</CardTitle>
                  {user.role === "ADMIN" && <PackageActions pkg={pkg} />}
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  {LESSON_TYPES[pkg.lessonType as keyof typeof LESSON_TYPES]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {pkg.description && (
                  <p className="text-xs text-gray-500">{pkg.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTRY(pkg.price, pkg.currency, rates)}
                    </p>
                    <p className="text-xs text-gray-500">{pkg.totalHours} saat</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {pkg.validityDays && <p>{pkg.validityDays} gün geçerli</p>}
                    <p className="mt-1">{pkg._count.purchases} satış</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Henüz paket eklenmemiş</p>
        </div>
      )}
    </div>
  );
}
