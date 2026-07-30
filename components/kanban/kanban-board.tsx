"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Stage } from "@/lib/generated/prisma/enums";
import { moveApplicationStage, type MoveInput } from "@/lib/actions/stage";
import { STAGE_LABELS } from "@/lib/stages";
import type {
  BoardCandidate,
  BoardOpening,
} from "@/components/kanban/board-types";
import { CandidateCard } from "@/components/kanban/candidate-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { BucketColumn } from "@/components/kanban/bucket-column";
import {
  ApproveDialog,
  InterviewUrlDialog,
  RejectDialog,
} from "@/components/kanban/move-dialogs";

const PIPELINE: Stage[] = ["POOL", "INTERVIEW", "SHORTLIST"];
const STAGES: Stage[] = [...PIPELINE, "APPROVED", "REJECTED"];

type Extras = Partial<
  Pick<
    MoveInput,
    | "rejectionType"
    | "rejectionReason"
    | "interviewUrlKind"
    | "ctcDetails"
    | "dateOfJoining"
    | "sendEmail"
  >
>;

interface PendingMove {
  candidate: BoardCandidate;
  toStage: Stage;
}

export function KanbanBoard({
  opening,
  candidates,
}: {
  opening: BoardOpening;
  candidates: BoardCandidate[];
}) {
  const router = useRouter();
  // Optimistic overlay: candidateId -> stage shown locally until the server
  // confirms (router.refresh() re-syncs the source of truth).
  const [overlay, setOverlay] = useState<Record<string, Stage>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, [] as BoardCandidate[]]));
    for (const c of candidates) {
      const stage = overlay[c.id] ?? c.stage;
      map[stage].push({ ...c, stage });
    }
    return map as Record<Stage, BoardCandidate[]>;
  }, [candidates, overlay]);

  const activeCandidate = activeId
    ? candidates.find((c) => c.id === activeId)
    : null;

  function commit(candidate: BoardCandidate, toStage: Stage, extras: Extras = {}) {
    setOverlay((prev) => ({ ...prev, [candidate.id]: toStage }));
    void (async () => {
      const result = await moveApplicationStage({
        applicationId: candidate.id,
        toStage,
        ...extras,
      });
      if (result.ok) {
        toast.success(`${candidate.fullName} → ${STAGE_LABELS[toStage]}`);
        router.refresh();
      } else {
        // Roll back — the card snaps back to its server stage.
        setOverlay((prev) => {
          const next = { ...prev };
          delete next[candidate.id];
          return next;
        });
        toast.error(result.error);
      }
    })();
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const candidate = candidates.find((c) => c.id === String(active.id));
    if (!candidate) return;
    const currentStage = overlay[candidate.id] ?? candidate.stage;
    const toStage = String(over.id) as Stage;
    if (!STAGES.includes(toStage) || toStage === currentStage) return;

    // Gated moves open a dialog first; the card stays put until confirmed.
    if (toStage === "INTERVIEW" || toStage === "REJECTED" || toStage === "APPROVED") {
      setPending({ candidate: { ...candidate, stage: currentStage }, toStage });
      return;
    }
    commit(candidate, toStage);
  }

  function confirmPending(extras: Extras) {
    if (!pending) return;
    commit(pending.candidate, pending.toStage, extras);
    setPending(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {PIPELINE.map((stage) => (
            <KanbanColumn key={stage} stage={stage} candidates={byStage[stage]} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BucketColumn
            stage="APPROVED"
            candidates={byStage.APPROVED}
            hint="Drag a candidate here to approve them."
          />
          <BucketColumn
            stage="REJECTED"
            candidates={byStage.REJECTED}
            hint="Drag a candidate here to reject them — you'll be asked who ended the process."
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCandidate ? (
          <CandidateCard candidate={activeCandidate} overlay />
        ) : null}
      </DragOverlay>

      <InterviewUrlDialog
        candidate={pending?.toStage === "INTERVIEW" ? pending.candidate : null}
        opening={opening}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
      <RejectDialog
        candidate={pending?.toStage === "REJECTED" ? pending.candidate : null}
        opening={opening}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
      <ApproveDialog
        candidate={pending?.toStage === "APPROVED" ? pending.candidate : null}
        opening={opening}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </DndContext>
  );
}
