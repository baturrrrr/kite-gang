"use server";

import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { instructor: true },
  });

  if (!user || !user.isActive) {
    return { error: "E-posta veya şifre hatalı" };
  }

  const passwordMatch = await bcrypt.compare(parsed.data.password, user.password);
  if (!passwordMatch) {
    return { error: "E-posta veya şifre hatalı" };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    instructorId: user.instructor?.id ?? null,
  });

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/giris");
}
