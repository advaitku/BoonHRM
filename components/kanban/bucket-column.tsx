"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown } from "lucide-react";
import type { Stage } from "@/lib/generated/prisma/enums";
import { STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { CandidateCard } from "@/components/kanban/candidate-card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Collapsed terminal bucket (Approved / Rejected). The whole section is a drop
// target even while collapsed, so cards can be dragged straight onto the header.
export function BucketColumn({
  stage,
  candidates,
  hint,
}: {
  stage: Stage;
  candidates: BoardCandidate[];
  hint: string;
}) {
  const [open, setOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-xl border border-t-4 bg-muted/30 transition-colors",
          STAGE_ACCENTS[stage].column,
          isOver && "bg-primary/5 ring-2 ring-primary/40",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", STAGE_ACCENTS[stage].dot)} />
              <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
              <Badge variant="secondary">{candidates.length}</Badge>
              {isOver && (
                <span className="text-xs text-muted-foreground">
                  release to move here
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-2">
            {candidates.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {hint}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {candidates.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <CandidateCard candidate={c} />
                    {stage === "REJECTED" && c.rejectionType && (
                      <p className="px-1 text-[11px] text-muted-foreground">
                        {c.rejectionType === "CANDIDATE_DECLINED"
                          ? "Candidate declined"
                          : "Rejected by company"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
