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
import { getAutoRejectDays } from "@/lib/settings";
import { ALL_STAGES, STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { Stage } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StageBadge } from "@/components/candidates/stage-badge";
import {
  PipelineChart,
  type PipelinePoint,
} from "@/components/dashboard/pipeline-chart";
import { cn } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireUser();
  const { q } = await searchParams;
  const query = q?.trim() || "";
  const autoRejectDays = await getAutoRejectDays();

  const warnCutoff = new Date(
    Date.now() - Math.max(1, autoRejectDays - 14) * 86_400_000,
  );
  const chartStart = startOfWeek(new Date(Date.now() - 11 * 7 * 86_400_000));

  const [
    openOpenings,
    activePipeline,
    inInterview,
    approvedTotal,
    nearingAutoReject,
    recentCandidates,
    recentRejections,
  ] = await Promise.all([
    prisma.jobOpening.count({ where: { status: "OPEN" } }),
    prisma.application.count({
      where: { stage: { in: ["POOL", "INTERVIEW", "SHORTLIST"] } },
    }),
    prisma.application.count({ where: { stage: "INTERVIEW" } }),
    prisma.application.count({ where: { stage: "APPROVED" } }),
    prisma.application.count({
      where: {
        stage: { in: ["POOL", "INTERVIEW", "SHORTLIST"] },
        createdAt: { lt: warnCutoff },
      },
    }),
    prisma.application.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
    }),
    prisma.application.findMany({
      where: { rejectedAt: { gte: chartStart } },
      select: { rejectedAt: true },
    }),
  ]);

  const chartData = buildWeeklySeries(
    chartStart,
    recentCandidates.map((c) => c.createdAt),
    recentRejections
      .map((c) => c.rejectedAt)
      .filter((d): d is Date => Boolean(d)),
  );

  const results = query
    ? await prisma.candidate.findMany({
        where: {
          OR: [
            { fullName: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        },
        include: {
          applications: {
            include: { jobOpening: { select: { id: true, title: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : null;

  const openings = await prisma.jobOpening.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { applications: { select: { stage: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Hi, {session.user.name.split(" ")[0]}
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
                    </p>
                    {c.applications.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {c.applications.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            {a.jobOpening.title}
                            <StageBadge stage={a.stage} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
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
            <MetricCard icon={Video} label="In interview" value={inInterview} />
            <MetricCard icon={CheckCircle2} label="Approved" value={approvedTotal} />
          </div>

          {nearingAutoReject > 0 && (
            <div className="flex items-center gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                <strong>{nearingAutoReject}</strong> candidate(s) have been in the
                pipeline for over {Math.max(1, autoRejectDays - 14)} days and will
                be auto-rejected at {autoRejectDays} days.
              </span>
            </div>
          )}

          <PipelineChart data={chartData} />

          {/* Open openings overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current openings</h2>
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
                  const total = opening.applications.length;
                  const counts = countByStage(opening.applications.map((a) => a.stage));
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
    <Card
      className={cn(
        href && "h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="bg-muted p-2.5">
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

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeeklySeries(
  start: Date,
  added: Date[],
  rejected: Date[],
): PipelinePoint[] {
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  const weeks: PipelinePoint[] = [];
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(start.getTime() + i * 7 * 86_400_000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
    weeks.push({
      week: fmt.format(weekStart),
      added: added.filter((d) => d >= weekStart && d < weekEnd).length,
      rejected: rejected.filter((d) => d >= weekStart && d < weekEnd).length,
    });
  }
  return weeks;
}
