import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Standalone super-admin shell: deliberately outside the (app) sidebar layout.
// This is the platform operator's area, not part of the HR product surface.
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/Boon_Logo.png" alt="Boon" width={30} height={25} />
            <span className="font-heading text-base font-semibold">
              Command Center
            </span>
            <Badge variant="secondary">Super admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Open app
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
