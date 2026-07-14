import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}
