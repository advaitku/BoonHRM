"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "@/lib/generated/prisma/enums";
import { moveApplicationStage, type MoveInput } from "@/lib/actions/stage";
import { ALL_STAGES, STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { BoardOpening } from "@/components/kanban/board-types";
import {
  ApproveDialog,
  InterviewUrlDialog,
  RejectDialog,
  type MoveSubject,
} from "@/components/kanban/move-dialogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

/**
 * Inline "Move to…" control for one application — the same gated dialogs the
 * Kanban board uses (interview URL / rejection reason / approval details),
 * funneling into moveApplicationStage.
 */
export function ApplicationStageMenu({
  applicationId,
  subject,
  opening,
  currentStage,
}: {
  applicationId: string;
  subject: MoveSubject;
  opening: BoardOpening;
  currentStage: Stage;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gate, setGate] = useState<Stage | null>(null);

  function commit(toStage: Stage, extras: Extras = {}) {
    startTransition(async () => {
      const result = await moveApplicationStage({
        applicationId,
        toStage,
        ...extras,
      });
      if (result.ok) {
        toast.success(`${subject.fullName} → ${STAGE_LABELS[toStage]}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onPick(toStage: Stage) {
    if (toStage === "INTERVIEW" || toStage === "REJECTED" || toStage === "APPROVED") {
      setGate(toStage);
      return;
    }
    commit(toStage);
  }

  function confirmGate(extras: Extras) {
    if (!gate) return;
    commit(gate, extras);
    setGate(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            Move to
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ALL_STAGES.filter((s) => s !== currentStage).map((stage) => (
            <DropdownMenuItem key={stage} onSelect={() => onPick(stage)}>
              <span
                className={cn("size-2 rounded-full", STAGE_ACCENTS[stage].dot)}
              />
              {STAGE_LABELS[stage]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <InterviewUrlDialog
        candidate={gate === "INTERVIEW" ? subject : null}
        opening={opening}
        onConfirm={confirmGate}
        onCancel={() => setGate(null)}
      />
      <RejectDialog
        candidate={gate === "REJECTED" ? subject : null}
        opening={opening}
        onConfirm={confirmGate}
        onCancel={() => setGate(null)}
      />
      <ApproveDialog
        candidate={gate === "APPROVED" ? subject : null}
        opening={opening}
        onConfirm={confirmGate}
        onCancel={() => setGate(null)}
      />
    </>
  );
}
