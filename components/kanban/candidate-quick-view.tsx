"use client";

import Link from "next/link";
import { ArrowRight, Clock, Mail, MessageSquare, Phone } from "lucide-react";

import type { Stage } from "@/lib/generated/prisma/enums";
import { ALL_STAGES, STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { daysSince } from "@/components/kanban/board-types";
import { StageBadge } from "@/components/candidates/stage-badge";
import { tagChipClass } from "@/lib/tag-colors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Card-click companion to drag-and-drop: the details the compact card no longer
 * shows, plus a one-click move. Presentational — the board owns the mutation,
 * so gated stages still route through the existing move dialogs.
 */
export function CandidateQuickView({
  candidate,
  onMove,
  onClose,
}: {
  candidate: BoardCandidate | null;
  onMove: (toStage: Stage) => void;
  onClose: () => void;
}) {
  const days = candidate ? daysSince(candidate.stageEnteredAt) : 0;

  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {candidate.fullName}
                <StageBadge stage={candidate.stage} />
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {candidate.email || candidate.phone ? (
                <div className="space-y-1">
                  {candidate.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <a
                        href={`mailto:${candidate.email}`}
                        className="truncate hover:underline"
                      >
                        {candidate.email}
                      </a>
                    </p>
                  )}
                  {candidate.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                      {candidate.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No contact on file</p>
              )}

              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {days === 0 ? "Entered this stage today" : `${days} days in stage`}
                </span>
                {candidate.commentCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" />
                    {candidate.commentCount}{" "}
                    {candidate.commentCount === 1 ? "comment" : "comments"}
                  </span>
                )}
              </p>

              {candidate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {candidate.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={cn(
                        "inline-flex border px-1.5 py-px text-xs font-medium leading-5",
                        tagChipClass(tag.color),
                      )}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Move to</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STAGES.filter((s) => s !== candidate.stage).map((stage) => (
                    <Button
                      key={stage}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => onMove(stage)}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          STAGE_ACCENTS[stage].dot,
                        )}
                      />
                      {STAGE_LABELS[stage]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/candidates/${candidate.candidateId}`}>
                  Open full profile
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
