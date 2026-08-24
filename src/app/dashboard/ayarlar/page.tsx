import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "./user-management";

export default async function SettingsPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { instructor: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kullanıcı Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagement users={users} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sistem Bilgisi</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>KiteSurf Okulu Yönetim Sistemi</p>
          <p>Veritabanı: SQLite (Prisma ORM)</p>
          <p>PostgreSQL'e geçiş için DATABASE_URL&apos;yi güncelleyin ve şemayı migrate edin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
