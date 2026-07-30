"use client";

import { useRouter } from "next/navigation";
import { Clock, FileText, MessageSquare } from "lucide-react";
import type { BoardCandidate } from "@/components/kanban/board-types";
import { daysSince } from "@/components/kanban/board-types";
import { StageBadge } from "@/components/candidates/stage-badge";
import { getInitials } from "@/lib/initials";
import { tagChipClass } from "@/lib/tag-colors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CandidatesTable({ candidates }: { candidates: BoardCandidate[] }) {
  const router = useRouter();

  return (
    <div className="border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>In stage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow
              key={candidate.id}
              className="cursor-pointer"
              onClick={() => router.push(`/candidates/${candidate.candidateId}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {getInitials(candidate.fullName) || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{candidate.fullName}</span>
                      {candidate.hasResume && (
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {candidate.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="size-3 shrink-0" />
                        {candidate.commentCount}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StageBadge stage={candidate.stage} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {candidate.email ?? candidate.phone ?? "—"}
              </TableCell>
              <TableCell>
                {candidate.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {candidate.tags.map((tag) => (
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
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3 shrink-0" />
                  {daysSince(candidate.stageEnteredAt) === 0
                    ? "Today"
                    : `${daysSince(candidate.stageEnteredAt)}d`}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
