"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Stage } from "@/lib/generated/prisma/enums";
import { STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { CandidateCard } from "@/components/kanban/candidate-card";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  stage,
  candidates,
  onOpen,
}: {
  stage: Stage;
  candidates: BoardCandidate[];
  onOpen?: (candidate: BoardCandidate) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Capped so a long column scrolls internally instead of stretching the
        // page — the other columns' drop targets stay on screen while dragging.
        "flex max-h-[65vh] min-h-[24rem] flex-col rounded-xl border border-t-4 bg-muted/30 transition-colors",
        STAGE_ACCENTS[stage].column,
        isOver && "bg-primary/5 ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", STAGE_ACCENTS[stage].dot)} />
          <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {candidates.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} onOpen={onOpen} />
        ))}
        {candidates.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            Drop candidates here
          </div>
        )}
      </div>
    </div>
  );
}
