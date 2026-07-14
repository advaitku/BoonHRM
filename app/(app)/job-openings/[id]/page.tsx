import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, BellOff, Link2, MapPin, Users } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OpeningActions } from "@/components/job-openings/opening-actions";
import { AddCandidateDialog } from "@/components/candidates/add-candidate-dialog";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default async function JobOpeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const opening = await prisma.jobOpening.findUnique({
    where: { id },
    include: {
      candidates: { orderBy: { stageEnteredAt: "asc" } },
    },
  });
  if (!opening) notFound();

  const closed = opening.status === "CLOSED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
          >
            <Link href="/job-openings">
              <ArrowLeft className="size-4" />
              All openings
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {opening.title}
            </h1>
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
              {opening.positions} {opening.positions === 1 ? "position" : "positions"}
            </span>
            <span className="inline-flex items-center gap-1">
              {opening.autoNotify ? (
                <>
                  <Bell className="size-3.5" />
                  Auto-notify on
                </>
              ) : (
                <>
                  <BellOff className="size-3.5" />
                  Auto-notify off
                </>
              )}
            </span>
            {(opening.onlineInterviewUrl || opening.inPersonInterviewUrl) && (
              <span className="inline-flex items-center gap-1">
                <Link2 className="size-3.5" />
                {[
                  opening.onlineInterviewUrl && "online",
                  opening.inPersonInterviewUrl && "in-person",
                ]
                  .filter(Boolean)
                  .join(" & ")}{" "}
                interview link
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AddCandidateDialog jobOpeningId={opening.id} />
          <OpeningActions openingId={opening.id} status={opening.status} />
        </div>
      </div>

      {opening.candidates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No candidates yet — add the first one to start the pipeline.
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          opening={{
            id: opening.id,
            onlineInterviewUrl: opening.onlineInterviewUrl,
            inPersonInterviewUrl: opening.inPersonInterviewUrl,
            autoNotify: opening.autoNotify,
          }}
          candidates={opening.candidates.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            stage: c.stage,
            stageEnteredAt: c.stageEnteredAt.toISOString(),
            hasResume: Boolean(c.resumeFilePath),
            rejectionType: c.rejectionType,
          }))}
        />
      )}
    </div>
  );
}
