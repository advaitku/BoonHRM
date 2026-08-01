"use client";

import { useRef } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, MessageSquare } from "lucide-react";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { daysSince } from "@/components/kanban/board-types";
import { tagChipClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

/** Matches the board's PointerSensor activation distance — past this the
 *  gesture was a drag, so the trailing click must not open the dialog. */
const DRAG_SLOP = 6;

export function CandidateCard({
  candidate,
  overlay = false,
  onOpen,
}: {
  candidate: BoardCandidate;
  overlay?: boolean;
  onOpen?: (candidate: BoardCandidate) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: candidate.id, disabled: overlay });

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const days = daysSince(candidate.stageEnteredAt);
  const shownTags = candidate.tags.slice(0, 2);
  const extraTags = candidate.tags.length - shownTags.length;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      style={
        overlay ? undefined : { transform: CSS.Translate.toString(transform) }
      }
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        // This prop is declared after {...listeners}, so it overrides dnd-kit's
        // own onPointerDown — forward to it or dragging never starts.
        if (!overlay) listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => {
        if (overlay || !onOpen) return;
        const start = pointerStart.current;
        pointerStart.current = null;
        // A drop fires a click too — only treat it as a click if we barely moved.
        if (
          start &&
          Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_SLOP
        ) {
          return;
        }
        onOpen(candidate);
      }}
      className={cn(
        "group cursor-grab select-none rounded-lg border bg-background px-2.5 py-1.5 shadow-xs transition-shadow",
        overlay
          ? "rotate-2 cursor-grabbing shadow-lg ring-2 ring-primary/30"
          : "hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <Link
        href={`/candidates/${candidate.candidateId}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="block truncate text-sm font-medium hover:underline"
      >
        {candidate.fullName}
      </Link>

      <div className="mt-0.5 flex items-center gap-1 overflow-hidden text-[11px] text-muted-foreground">
        {shownTags.map((tag) => (
          <span
            key={tag.id}
            className={cn(
              "shrink-0 border px-1 py-px font-medium leading-4",
              tagChipClass(tag.color),
            )}
          >
            {tag.name}
          </span>
        ))}
        {extraTags > 0 && (
          <span className="shrink-0 border bg-muted px-1 py-px font-medium leading-4">
            +{extraTags}
          </span>
        )}

        <span className="ml-auto inline-flex shrink-0 items-center gap-2">
          {candidate.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="size-3" />
              {candidate.commentCount}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5">
            <Clock className="size-3" />
            {days === 0 ? "Today" : `${days}d`}
          </span>
        </span>
      </div>
    </div>
  );
}
