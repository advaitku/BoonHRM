"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Valid email required"),
  role: z.enum(["admin", "hr"]),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "A user with that email already exists" };

  await prisma.user.create({
    data: { id: randomUUID(), name, email, role, emailVerified: true },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: "admin" | "hr",
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.user.id === userId && role !== "admin") {
    return { ok: false, error: "You cannot remove your own admin role" };
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };
  // Superadmin is assigned via scripts/make-superadmin.ts only — never from
  // the UI, and never removable by a regular admin.
  if (target.role === "superadmin") {
    return { ok: false, error: "Super admin accounts are managed outside the app" };
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserBanned(userId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { ok: false, error: "You cannot disable your own account" };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found" };
  if (user.role === "superadmin") {
    return { ok: false, error: "Super admin accounts are managed outside the app" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { banned: !user.banned },
  });
  // Kill active sessions when disabling.
  if (!user.banned) {
    await prisma.session.deleteMany({ where: { userId } });
  }
  revalidatePath("/admin/users");
  return { ok: true };
}
