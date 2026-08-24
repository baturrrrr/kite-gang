import { requireAdminOrReception } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Plus, Search, UserCheck, AlertCircle } from "lucide-react";
import { SKILL_LEVELS, CURRENCY_SYMBOLS } from "@/lib/constants";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seviye?: string; durum?: string }>;
}) {
  await requireAdminOrReception();
  const params = await searchParams;
  const q = params.q ?? "";
  const seviye = params.seviye ?? "";
  const durum = params.durum ?? "";

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      AND: [
        q ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        } : {},
        seviye ? { skillLevel: seviye } : {},
      ],
    },
    include: {
      payments: { select: { amount: true, direction: true, currency: true } },
      hizmetler: {
        where: { isActive: true, status: { not: "IPTAL" } },
        select: { amount: true, currency: true, scheduledAt: true, createdAt: true },
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const enriched = students.map((s) => {
    const totalCharged = s.hizmetler.reduce((sum, h) => sum + h.amount, 0);
    const totalPaid = s.payments
      .filter((p) => p.direction === "INCOMING")
      .reduce((sum, p) => sum + p.amount, 0);
    const netBalance = totalPaid - totalCharged;
    const currency = s.hizmetler[0]?.currency ?? "EUR";
    const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
    const lastService = s.hizmetler[0]?.scheduledAt ?? s.hizmetler[0]?.createdAt;
    return { ...s, totalCharged, totalPaid, netBalance, currency, symbol, lastService };
  });

  const filtered = durum
    ? enriched.filter((s) => {
        if (durum === "borc") return s.netBalance < -0.01;
        if (durum === "odenmis") return s.netBalance >= -0.01 && s.totalCharged > 0;
        if (durum === "yok") return s.totalCharged === 0;
        return true;
      })
    : enriched;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} müşteri</p>
        </div>
        <Link href="/dashboard/musteriler/yeni">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Müşteri
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Ad, soyad, telefon veya e-posta ara..."
            className="pl-9"
          />
        </div>
        <select
          name="seviye"
          defaultValue={seviye}
          className="border rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">Tüm Seviyeler</option>
          {Object.entries(SKILL_LEVELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          name="durum"
          defaultValue={durum}
          className="border rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">Tüm Durumlar</option>
          <option value="borc">Borç Var</option>
          <option value="odenmis">Ödenmiş</option>
          <option value="yok">Hizmet Yok</option>
        </select>
        <Button type="submit" variant="secondary">Filtrele</Button>
      </form>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Müşteri Listesi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Müşteri bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Müşteri</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">İletişim</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Son Hizmet</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ödeme Durumu</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ödenen / Borç</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((student) => {
                    const hasDebt = student.netBalance < -0.01;
                    const hasSurplus = student.netBalance > 0.01;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/musteriler/${student.id}`} className="hover:text-blue-600">
                            <div className="font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {SKILL_LEVELS[student.skillLevel as keyof typeof SKILL_LEVELS]}
                            </Badge>
                            {student.waiverSigned ? (
                              <span className="flex items-center gap-1 text-green-600 text-xs">
                                <UserCheck className="w-3 h-3" /> Feragatname
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-orange-500 text-xs">
                                <AlertCircle className="w-3 h-3" /> Bekliyor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {student.phone ?? "—"}
                          {student.email && (
                            <div className="text-xs text-gray-400">{student.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {student.lastService
                            ? format(new Date(student.lastService), "d MMM yyyy", { locale: tr })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {student.totalCharged === 0 ? (
                            <span className="text-gray-400 text-xs">Hizmet yok</span>
                          ) : hasDebt ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                              Borç Var
                            </Badge>
                          ) : hasSurplus ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                              Fazla Ödeme
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                              Ödenmiş
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {student.totalCharged > 0 ? (
                            <div>
                              <span className="text-green-600 font-medium">
                                {student.symbol}{student.totalPaid.toFixed(2)}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className={hasDebt ? "text-red-600 font-semibold" : "text-gray-700"}>
                                {student.symbol}{student.totalCharged.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/musteriler/${student.id}`}>
                            <Button variant="ghost" size="sm">Görüntüle</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
