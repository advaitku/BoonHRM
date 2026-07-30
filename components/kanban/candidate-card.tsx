"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, FileText, Mail, MessageSquare, Phone } from "lucide-react";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { daysSince } from "@/components/kanban/board-types";
import { getInitials } from "@/lib/initials";
import { tagChipClass } from "@/lib/tag-colors";
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
  const initials = getInitials(candidate.fullName);

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
              href={`/candidates/${candidate.candidateId}`}
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
          {candidate.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {candidate.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className={cn(
                    "inline-flex border px-1.5 py-px text-[10px] font-medium leading-4",
                    tagChipClass(tag.color),
                  )}
                >
                  {tag.name}
                </span>
              ))}
              {candidate.tags.length > 3 && (
                <span className="inline-flex border bg-muted px-1.5 py-px text-[10px] font-medium leading-4 text-muted-foreground">
                  +{candidate.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground/80">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3 shrink-0" />
              {days === 0 ? "Today" : `${days}d in stage`}
            </span>
            {candidate.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3 shrink-0" />
                {candidate.commentCount}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
