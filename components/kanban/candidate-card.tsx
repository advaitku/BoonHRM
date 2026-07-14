"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, FileText, Mail, Phone } from "lucide-react";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { daysSince } from "@/components/kanban/board-types";
import { cn } from "@/lib/utils";

export function CandidateCard({
  candidate,
  overlay = false,
}: {
  candidate: BoardCandidate;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: candidate.id, disabled: overlay });

  const days = daysSince(candidate.stageEnteredAt);
  const initials = candidate.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      style={
        overlay ? undefined : { transform: CSS.Translate.toString(transform) }
      }
      className={cn(
        "group cursor-grab select-none rounded-lg border bg-background p-3 shadow-xs transition-shadow",
        overlay
          ? "rotate-2 cursor-grabbing shadow-lg ring-2 ring-primary/30"
          : "hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/candidates/${candidate.id}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="truncate text-sm font-medium hover:underline"
            >
              {candidate.fullName}
            </Link>
            {candidate.hasResume && (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          {candidate.email && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" />
              {candidate.email}
            </p>
          )}
          {!candidate.email && candidate.phone && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              {candidate.phone}
            </p>
          )}
          <p className="flex items-center gap-1 text-xs text-muted-foreground/80">
            <Clock className="size-3 shrink-0" />
            {days === 0 ? "Today" : `${days}d in stage`}
          </p>
        </div>
      </div>
    </div>
  );
}
