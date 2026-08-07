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

// "superadmin" is the platform operator (us), above per-company admins. It
// passes every admin check and is the only role allowed into /command-center.
// Not creatable from the UI — assigned via `npx tsx scripts/make-superadmin.ts`.

export async function requireAdmin() {
  const session = await requireUser();
  if (!isAdmin(session.user.role)) redirect("/dashboard");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireUser();
  if (session.user.role !== "superadmin") redirect("/dashboard");
  return session;
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}
