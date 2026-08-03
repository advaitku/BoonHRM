// Boon Jobs — public landing page at "/". Lists published OPEN roles, each
// linking to its /jobs/BOON-XXX page. Sits outside all route groups (the
// (public) layout centers a single card, wrong for a full-page landing) and
// outside the middleware matcher, so it is public by construction.
//
// Confidentiality invariant (same as /jobs/[ref]): only rows with
// publishedAt set are ever selected — an unpublished opening's title must
// never appear in this page's HTML or RSC payload.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Hash,
  MapPin,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";
import { getCompanyName } from "@/lib/settings";
import { BOON_CONTACT } from "@/lib/brand";
import { formatJobRef } from "@/lib/job-ref";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export async function generateMetadata(): Promise<Metadata> {
  const companyName = await getCompanyName();
  const title = `Boon Jobs — ${companyName}`;
  const description = `Open roles at ${companyName}. Browse current openings and apply.`;
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    title,
    description,
    alternates: { canonical: base },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: base,
      siteName: companyName,
      images: [{ url: "/Boon_Logo.png", width: 305, height: 258 }],
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function LandingPage() {
  const [session, companyName, roles] = await Promise.all([
    getSession(),
    getCompanyName(),
    prisma.jobOpening.findMany({
      where: { publishedAt: { not: null }, status: "OPEN" },
      orderBy: { publishedAt: "desc" },
      select: {
        refNumber: true,
        title: true,
        location: true,
        positions: true,
        publishedAt: true,
        closureDeadline: true,
      },
    }),
  ]);

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Button asChild variant="outline" size="sm">
            <Link href={session ? "/dashboard" : "/login"}>
              {session ? "Dashboard" : "Log in"}
            </Link>
          </Button>
          <a
            href={BOON_CONTACT.website}
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Image src="/Boon_Logo.png" alt="" width={28} height={24} />
            <span className="font-heading text-sm font-semibold tracking-tight">
              {companyName}
            </span>
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
        <div className="space-y-3">
          <Image
            src="/Boon_Logo.png"
            alt={companyName}
            width={72}
            height={61}
            priority
          />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            We&apos;re hiring
          </p>
          <h1 className="font-heading text-3xl">Boon Jobs</h1>
          <p className="text-muted-foreground">
            Open roles at {companyName}. Pick a role to see the full details and
            how to apply.
          </p>
        </div>

        {roles.length > 0 ? (
          <Card className="divide-y overflow-hidden p-0">
            {roles.map((role) => (
              <Link
                key={role.refNumber}
                href={`/jobs/${formatJobRef(role.refNumber)}`}
                className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-medium">{role.title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                      <Hash className="size-3.5" />
                      {formatJobRef(role.refNumber)}
                    </span>
                    {role.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {role.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      {role.positions}{" "}
                      {role.positions === 1 ? "position" : "positions"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      Posted {dateFmt.format(role.publishedAt!)}
                    </span>
                    {role.closureDeadline && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        Apply by {dateFmt.format(role.closureDeadline)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </Card>
        ) : (
          <div className="rounded-lg border bg-muted/40 p-6 text-sm text-muted-foreground">
            No open roles right now. Check back soon, or visit{" "}
            <a
              href={BOON_CONTACT.website}
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              {BOON_CONTACT.websiteLabel}
            </a>{" "}
            to learn more about us.
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Candidates don&apos;t need an account — open a role and apply by
          email.
        </p>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-muted-foreground">
          <a
            href={BOON_CONTACT.website}
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {BOON_CONTACT.websiteLabel}
          </a>
          <span>{BOON_CONTACT.phone}</span>
          <span>
            © {new Date().getFullYear()} {companyName}
          </span>
        </div>
      </footer>
    </div>
  );
}
