import "server-only";
import { getSession, SessionPayload } from "./session";
import { redirect } from "next/navigation";

export async function getCurrentUser(): Promise<SessionPayload | null> {
  return getSession();
}

export async function requireAuth(): Promise<SessionPayload> {
  const user = await getSession();
  if (!user) redirect("/giris");
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
