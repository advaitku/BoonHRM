import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { AppSidebar } from "@/components/app/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import packageJson from "@/package.json";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role ?? "hr",
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 !h-4" />
          <span className="font-heading text-sm">Boon HRM</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            <ShieldAlert className="size-3" />
            Internal
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>

        <footer className="border-t px-6 py-3">
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Confidential &amp; Restricted — Boon internal use only · v
            {packageJson.version}
          </p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
