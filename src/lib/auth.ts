import "server-only";
import { cache } from "react";
import { getSession, SessionPayload } from "./session";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

// Oturum çerezi 7 gün geçerli; bu sürede kullanıcı pasife alınabilir veya rolü
// değişebilir. Bu yüzden kullanıcı her istekte veritabanından doğrulanır ve
// çerezdeki rol/isim yerine güncel değerler kullanılır.
export const getCurrentUser = cache(async (): Promise<SessionPayload | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      instructor: { select: { id: true } },
    },
  });
  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    instructorId: user.instructor?.id ?? null,
  };
});

export async function requireAuth(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  // Çerez hâlâ geçerli olabilir; önce temizlenmeli, yoksa proxy /giris'ten /dashboard'a geri yollar.
  if (!user) redirect("/api/oturum-kapat");
  return user;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireAdminOrReception(): Promise<SessionPayload> {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "RECEPTION") redirect("/dashboard");
  return user;
}

export const ROLES = {
  ADMIN: "ADMIN",
  RECEPTION: "RECEPTION",
  INSTRUCTOR: "INSTRUCTOR",
} as const;

export type UserRole = keyof typeof ROLES;
