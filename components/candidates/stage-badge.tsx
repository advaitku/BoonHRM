import type { Stage } from "@/lib/generated/prisma/enums";
import { STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import { cn } from "@/lib/utils";

export function StageBadge({
  stage,
  className,
}: {
  stage: Stage;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STAGE_ACCENTS[stage].badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STAGE_ACCENTS[stage].dot)} />
      {STAGE_LABELS[stage]}
    </span>
  );
}
