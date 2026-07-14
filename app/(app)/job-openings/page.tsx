import Link from "next/link";
import { Briefcase, MapPin, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ALL_STAGES, STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { Stage } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function JobOpeningsPage() {
  await requireUser();

  const openings = await prisma.jobOpening.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      candidates: { select: { stage: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Openings</h1>
          <p className="text-muted-foreground">
            {openings.length === 0
              ? "Create your first opening to start tracking candidates."
              : `${openings.filter((o) => o.status === "OPEN").length} open · ${openings.filter((o) => o.status === "CLOSED").length} closed`}
          </p>
        </div>
        <Button asChild>
          <Link href="/job-openings/new">
            <Plus className="size-4" />
            New opening
          </Link>
        </Button>
      </div>

      {openings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Briefcase className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No job openings yet</p>
              <p className="text-sm text-muted-foreground">
                Each opening gets its own Kanban board of candidates.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/job-openings/new">
                <Plus className="size-4" />
                Create the first opening
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openings.map((opening) => {
            const counts = countByStage(opening.candidates.map((c) => c.stage));
            const total = opening.candidates.length;
            const closed = opening.status === "CLOSED";
            return (
              <Link key={opening.id} href={`/job-openings/${opening.id}`}>
                <Card
                  className={cn(
                    "h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
                    closed && "opacity-70",
                  )}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold leading-snug">{opening.title}</h2>
                      <Badge variant={closed ? "secondary" : "default"}>
                        {closed ? "Closed" : "Open"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {opening.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {opening.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {opening.positions}{" "}
                        {opening.positions === 1 ? "position" : "positions"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
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
                            <span key={s} className="inline-flex items-center gap-1.5">
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
  );
}

function countByStage(stages: Stage[]): Record<Stage, number> {
  const counts = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
    Stage,
    number
  >;
  for (const s of stages) counts[s]++;
  return counts;
}
