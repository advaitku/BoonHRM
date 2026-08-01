import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  CalendarClock,
  ExternalLink,
  EyeOff,
  Globe,
  Link2,
  MapPin,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { DEADLINE_URGENCY_CLASS, deadlineInfo } from "@/lib/deadline";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OpeningActions } from "@/components/job-openings/opening-actions";
import { AssigneePicker } from "@/components/job-openings/assignee-picker";
import { AddCandidateDialog } from "@/components/candidates/add-candidate-dialog";
import { CopyLink } from "@/components/candidates/copy-link";
import { JobDescription } from "@/components/job-openings/job-description";
import { OpeningCandidatesView } from "@/components/kanban/opening-candidates-view";
import { formatJobRef, jobUrl } from "@/lib/job-ref";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});


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
      applications: {
        orderBy: { stageEnteredAt: "asc" },
        include: {
          candidate: {
            include: {
              tags: { include: { tag: true } },
              _count: { select: { comments: true, resumes: true } },
            },
          },
        },
      },
    },
  });
  if (!opening) notFound();

  const closed = opening.status === "CLOSED";
  // A closed opening's countdown is meaningless — show the date only.
  const deadline =
    opening.closureDeadline && !closed
      ? deadlineInfo(opening.closureDeadline)
      : null;
  const teamUsers = await prisma.user.findMany({
    where: { banned: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

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
            <span className="font-mono text-sm text-muted-foreground">
              {formatJobRef(opening.refNumber)}
            </span>
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
            {opening.closureDeadline && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  deadline && DEADLINE_URGENCY_CLASS[deadline.urgency],
                )}
              >
                {deadline?.urgency === "passed" && (
                  <AlertTriangle className="size-3.5" />
                )}
                Closes {dateFmt.format(opening.closureDeadline)}
                {deadline && <span>· {deadline.label}</span>}
              </span>
            )}
            {opening.interviewDeadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" />
                Interview by {dateFmt.format(opening.interviewDeadline)}
              </span>
            )}
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

          {opening.publishedAt ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="gap-1">
                <Globe className="size-3" />
                Published
              </Badge>
              <div className="w-full max-w-sm">
                <CopyLink url={jobUrl(opening.refNumber)} />
              </div>
              <Button asChild variant="ghost" size="icon" className="size-7">
                <a
                  href={jobUrl(opening.refNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open public page"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
              <EyeOff className="size-3.5" />
              Not published —{" "}
              <Link
                href={`/job-openings/${opening.id}/edit`}
                className="underline underline-offset-2"
              >
                publish it
              </Link>{" "}
              to get a shareable link.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AssigneePicker
            openingId={opening.id}
            assignedToId={opening.assignedToId}
            users={teamUsers}
          />
          <AddCandidateDialog jobOpeningId={opening.id} />
          <OpeningActions openingId={opening.id} status={opening.status} />
        </div>
      </div>

      {opening.description && (
        <Card>
          <CardContent className="pt-6">
            <JobDescription html={opening.description} />
          </CardContent>
        </Card>
      )}

      {opening.applications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No candidates yet — add the first one to start the pipeline.
          </CardContent>
        </Card>
      ) : (
        <OpeningCandidatesView
          opening={{
            id: opening.id,
            onlineInterviewUrl: opening.onlineInterviewUrl,
            inPersonInterviewUrl: opening.inPersonInterviewUrl,
            autoNotify: opening.autoNotify,
          }}
          candidates={opening.applications.map((a) => ({
            id: a.id,
            candidateId: a.candidate.id,
            fullName: a.candidate.fullName,
            email: a.candidate.email,
            phone: a.candidate.phone,
            stage: a.stage,
            stageEnteredAt: a.stageEnteredAt.toISOString(),
            hasResume: a.candidate._count.resumes > 0,
            rejectionType: a.rejectionType,
            tags: a.candidate.tags.map((t) => ({
              id: t.tag.id,
              name: t.tag.name,
              color: t.tag.color,
            })),
            commentCount: a.candidate._count.comments,
          }))}
        />
      )}
    </div>
  );
}
