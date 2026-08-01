"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RejectionType, Stage } from "@/lib/generated/prisma/enums";
import { deleteApplication } from "@/lib/actions/applications";
import { STAGE_LABELS } from "@/lib/stages";
import type { BoardOpening } from "@/components/kanban/board-types";
import { daysSince } from "@/components/kanban/board-types";
import type { MoveSubject } from "@/components/kanban/move-dialogs";
import { ApplicationStageMenu } from "@/components/candidates/application-stage-menu";
import { StageBadge } from "@/components/candidates/stage-badge";
import { CopyLink } from "@/components/candidates/copy-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ApplicationRow {
  id: string;
  stage: Stage;
  stageEnteredAt: string; // ISO
  rejectionType: RejectionType | null;
  rejectionReason: string | null;
  offerState: "pending" | "accepted" | "declined" | "expired" | null;
  offerUrl: string | null;
  /** Snapshot of the latest accepted offer (null for pre-snapshot acceptances). */
  acceptedOffer: AcceptedOffer | null;
  opening: BoardOpening & { title: string };
}

export interface AcceptedOffer {
  acceptedAt: string; // ISO
  jobTitle: string;
  companyName: string;
  candidateEmail: string;
  location: string | null;
  ctcDetails: string | null;
  dateOfJoining: string | null; // ISO date (YYYY-MM-DD)
  agreementText: string;
}

const acceptedAtFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatJoiningDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** Primary card on the candidate page: every opening this person applied to,
 * each with its stage, inline stage moves and a per-application remove. */
export function ApplicationsPanel({
  subject,
  applications,
}: {
  subject: MoveSubject;
  applications: ApplicationRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState<ApplicationRow | null>(null);
  const [viewAcceptance, setViewAcceptance] = useState<ApplicationRow | null>(null);

  function remove(application: ApplicationRow) {
    startTransition(async () => {
      const result = await deleteApplication(application.id);
      if (result.ok) {
        toast.success(`Removed from ${application.opening.title}`);
        setConfirmRemove(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Applications
          <span className="ml-2 font-normal text-muted-foreground">
            {applications.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Not applied to any opening. Add them from a job opening page.
          </p>
        ) : (
          <ul className="divide-y">
            {applications.map((application) => {
              const days = daysSince(application.stageEnteredAt);
              return (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/job-openings/${application.opening.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {application.opening.title}
                      </Link>
                      <StageBadge stage={application.stage} />
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3 shrink-0" />
                        In {STAGE_LABELS[application.stage]}{" "}
                        {days === 0 ? "since today" : `for ${days}d`}
                      </span>
                      {application.stage === "REJECTED" && application.rejectionType && (
                        <span>
                          {application.rejectionType === "CANDIDATE_DECLINED"
                            ? "Candidate declined"
                            : "Rejected by company"}
                          {application.rejectionReason
                            ? ` — ${application.rejectionReason}`
                            : ""}
                        </span>
                      )}
                    </p>
                    {((application.stage === "APPROVED" && application.offerState) ||
                      application.acceptedOffer) && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {application.stage === "APPROVED" && (
                          <>
                            {application.offerState === "accepted" && (
                              <Badge>Offer accepted</Badge>
                            )}
                            {application.offerState === "declined" && (
                              <Badge variant="destructive">Offer declined</Badge>
                            )}
                            {application.offerState === "pending" && (
                              <Badge variant="outline">Awaiting offer response</Badge>
                            )}
                            {application.offerState === "expired" && (
                              <Badge variant="secondary">Offer link expired</Badge>
                            )}
                          </>
                        )}
                        {application.acceptedOffer && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              Accepted{" "}
                              {acceptedAtFmt.format(
                                new Date(application.acceptedOffer.acceptedAt),
                              )}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 gap-1 px-2 text-xs"
                              onClick={() => setViewAcceptance(application)}
                            >
                              <FileCheck className="size-3" />
                              View accepted offer
                            </Button>
                          </>
                        )}
                        {application.offerState === "pending" && application.offerUrl && (
                          <CopyLink url={application.offerUrl} />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ApplicationStageMenu
                      applicationId={application.id}
                      subject={subject}
                      opening={application.opening}
                      currentStage={application.stage}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove from this opening"
                      onClick={() => setConfirmRemove(application)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={Boolean(confirmRemove)}
        onOpenChange={(v) => !v && setConfirmRemove(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Remove from {confirmRemove?.opening.title}?
            </DialogTitle>
            <DialogDescription>
              This deletes the application, its stage history and its email log
              for this opening. The candidate&apos;s profile, resumes and other
              applications are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => confirmRemove && remove(confirmRemove)}
            >
              Remove application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewAcceptance)}
        onOpenChange={(v) => !v && setViewAcceptance(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {viewAcceptance?.acceptedOffer && (
            <>
              <DialogHeader>
                <DialogTitle>Accepted offer</DialogTitle>
                <DialogDescription>
                  {viewAcceptance.acceptedOffer.jobTitle} at{" "}
                  {viewAcceptance.acceptedOffer.companyName} — accepted{" "}
                  {acceptedAtFmt.format(
                    new Date(viewAcceptance.acceptedOffer.acceptedAt),
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">Verified email</dt>
                  <dd className="break-all">
                    {viewAcceptance.acceptedOffer.candidateEmail}
                  </dd>
                  {viewAcceptance.acceptedOffer.location && (
                    <>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd>{viewAcceptance.acceptedOffer.location}</dd>
                    </>
                  )}
                  {viewAcceptance.acceptedOffer.dateOfJoining && (
                    <>
                      <dt className="text-muted-foreground">Date of joining</dt>
                      <dd>
                        {formatJoiningDate(
                          viewAcceptance.acceptedOffer.dateOfJoining,
                        )}
                      </dd>
                    </>
                  )}
                </dl>
                {viewAcceptance.acceptedOffer.ctcDetails && (
                  <div className="space-y-1.5">
                    <h4 className="font-medium">Compensation</h4>
                    <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3">
                      {viewAcceptance.acceptedOffer.ctcDetails}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <h4 className="font-medium">Terms &amp; agreement accepted</h4>
                  <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-muted-foreground">
                    {viewAcceptance.acceptedOffer.agreementText}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewAcceptance(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
