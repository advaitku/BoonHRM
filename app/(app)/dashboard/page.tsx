import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Search,
  Users,
  Video,
} from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ALL_STAGES, STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { Stage } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StageBadge } from "@/components/candidates/stage-badge";
import { cn } from "@/lib/utils";

const AUTO_REJECT_DAYS = Number(process.env.AUTO_REJECT_DAYS || 75);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireUser();
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const warnCutoff = new Date(
    Date.now() - (AUTO_REJECT_DAYS - 14) * 86_400_000,
  );

  const [openOpenings, activePipeline, inInterview, approvedTotal, nearingAutoReject] =
    await Promise.all([
      prisma.jobOpening.count({ where: { status: "OPEN" } }),
      prisma.candidate.count({
        where: { stage: { in: ["POOL", "INTERVIEW", "SHORTLIST"] } },
      }),
      prisma.candidate.count({ where: { stage: "INTERVIEW" } }),
      prisma.candidate.count({ where: { stage: "APPROVED" } }),
      prisma.candidate.count({
        where: {
          stage: { in: ["POOL", "INTERVIEW", "SHORTLIST"] },
          createdAt: { lt: warnCutoff },
        },
      }),
    ]);

  const results = query
    ? await prisma.candidate.findMany({
        where: {
          OR: [
            { fullName: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        },
        include: { jobOpening: { select: { id: true, title: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : null;

  const openings = await prisma.jobOpening.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { candidates: { select: { stage: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {session.user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening across your hiring pipeline.
        </p>
      </div>

      {/* Global candidate search */}
      <form method="GET" className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search candidates by name, email or phone…"
          className="h-11 pl-9 pr-24"
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1">
          {query && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Clear</Link>
            </Button>
          )}
          <Button type="submit" size="sm">
            Search
          </Button>
        </div>
      </form>

      {results !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {results.length === 0
                ? `No candidates match “${query}”`
                : `${results.length} candidate(s) matching “${query}”`}
            </CardTitle>
          </CardHeader>
          {results.length > 0 && (
            <CardContent className="divide-y p-0">
              {results.map((c) => (
                <Link
                  key={c.id}
                  href={`/candidates/${c.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.fullName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact"}
                      {" — "}
                      {c.jobOpening.title}
                    </p>
                  </div>
                  <StageBadge stage={c.stage} />
                </Link>
              ))}
            </CardContent>
          )}
        </Card>
      ) : (
        <>
          {/* Metric tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Briefcase}
              label="Open job openings"
              value={openOpenings}
              href="/job-openings"
            />
            <MetricCard
              icon={Users}
              label="Active candidates"
              value={activePipeline}
              hint="in Pool, Interview or Shortlist"
            />
            <MetricCard
              icon={Video}
              label="In interview"
              value={inInterview}
            />
            <MetricCard
              icon={CheckCircle2}
              label="Approved"
              value={approvedTotal}
            />
          </div>

          {nearingAutoReject > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                <strong>{nearingAutoReject}</strong> candidate(s) have been in the
                pipeline for over {AUTO_REJECT_DAYS - 14} days and will be
                auto-rejected at {AUTO_REJECT_DAYS} days.
              </span>
            </div>
          )}

          {/* Open openings overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Current openings
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/job-openings">View all</Link>
              </Button>
            </div>
            {openings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No open positions right now.{" "}
                  <Link href="/job-openings/new" className="underline">
                    Create one
                  </Link>
                  .
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openings.map((opening) => {
                  const total = opening.candidates.length;
                  const counts = countByStage(opening.candidates.map((c) => c.stage));
                  return (
                    <Link key={opening.id} href={`/job-openings/${opening.id}`}>
                      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardHeader className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold leading-snug">
                              {opening.title}
                            </h3>
                            <Badge variant="secondary">
                              {total} {total === 1 ? "candidate" : "candidates"}
                            </Badge>
                          </div>
                          {opening.location && (
                            <p className="text-sm text-muted-foreground">
                              {opening.location}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {total > 0 ? (
                            <>
                              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                                {ALL_STAGES.filter((s) => counts[s] > 0).map((s) => (
                                  <div
                                    key={s}
                                    className={cn(STAGE_ACCENTS[s].dot)}
                                    style={{ width: `${(counts[s] / total) * 100}%` }}
                                  />
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {ALL_STAGES.filter((s) => counts[s] > 0).map((s) => (
                                  <span
                                    key={s}
                                    className="inline-flex items-center gap-1.5"
                                  >
                                    <span
                                      className={cn(
                                        "size-2 rounded-full",
                                        STAGE_ACCENTS[s].dot,
                                      )}
                                    />
                                    {STAGE_LABELS[s]} {counts[s]}
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No candidates yet
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className={cn(href && "h-full transition-all hover:-translate-y-0.5 hover:shadow-md")}>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-lg bg-muted p-2.5">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function countByStage(stages: Stage[]): Record<Stage, number> {
  const counts = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
    Stage,
    number
  >;
  for (const s of stages) counts[s]++;
  return counts;
}
