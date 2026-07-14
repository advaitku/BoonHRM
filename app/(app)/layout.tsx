import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { NavLinks } from "@/components/app/nav-links";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Badge } from "@/components/ui/badge";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const admin = session.user.role === "admin";

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/job-openings", label: "Job Openings" },
    ...(admin ? [{ href: "/admin/users", label: "Users" }] : []),
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            BoonHRM
          </Link>
          <NavLinks items={items} />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-none">
                {session.user.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {session.user.email}
              </div>
            </div>
            <Badge variant={admin ? "default" : "secondary"}>
              {admin ? "Admin" : "HR"}
            </Badge>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
