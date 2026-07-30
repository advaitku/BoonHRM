"use client";

import { useState } from "react";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import type { BoardCandidate, BoardOpening } from "@/components/kanban/board-types";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CandidatesTable } from "@/components/kanban/candidates-table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function OpeningCandidatesView({
  opening,
  candidates,
}: {
  opening: BoardOpening;
  candidates: BoardCandidate[];
}) {
  const [view, setView] = useState<"kanban" | "table">("kanban");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={view}
          onValueChange={(v) => v && setView(v as "kanban" | "table")}
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "table" ? (
        <CandidatesTable candidates={candidates} />
      ) : (
        <KanbanBoard opening={opening} candidates={candidates} />
      )}
    </div>
  );
}
