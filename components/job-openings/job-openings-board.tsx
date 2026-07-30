"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  LayoutGrid,
  ListFilter,
  MapPin,
  SearchX,
  Table as TableIcon,
  Users,
  X,
} from "lucide-react";
import { ALL_STAGES, STAGE_ACCENTS, STAGE_LABELS } from "@/lib/stages";
import type { Stage } from "@/lib/generated/prisma/enums";
import { getInitials } from "@/lib/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface JobOpeningListItem {
  id: string;
  title: string;
  location: string | null;
  positions: number;
  status: "OPEN" | "CLOSED";
  createdAt: string; // ISO
  assignedToId: string | null;
  closureDeadline: string | null; // ISO
  stages: Stage[];
}

const deadlineFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export interface TeamUser {
  id: string;
  name: string;
}

type SortKey = "newest" | "oldest" | "title" | "candidates";

export function JobOpeningsBoard({
  openings,
  users,
}: {
  openings: JobOpeningListItem[];
  users: TeamUser[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"all" | "OPEN" | "CLOSED">("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"card" | "table">("card");

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const visible = useMemo(() => {
    let list = openings;
    if (status !== "all") list = list.filter((o) => o.status === status);
    if (assignee === "unassigned") list = list.filter((o) => !o.assignedToId);
    else if (assignee !== "all") list = list.filter((o) => o.assignedToId === assignee);

    const sorted = [...list];
    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "candidates":
        sorted.sort((a, b) => b.stages.length - a.stages.length);
        break;
      case "newest":
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }
    return sorted;
  }, [openings, status, assignee, sort]);

  const filtersActive = status !== "all" || assignee !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40 bg-background">
            <ListFilter className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-48 bg-background">
            <Users className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44 bg-background">
            <ArrowUpDown className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="title">Title (A–Z)</SelectItem>
            <SelectItem value="candidates">Most candidates</SelectItem>
          </SelectContent>
        </Select>

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setStatus("all");
              setAssignee("all");
            }}
          >
            <X />
            Reset
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {visible.length} of {openings.length}
        </span>

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={view}
          onValueChange={(v) => v && setView(v as "card" | "table")}
        >
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <SearchX className="size-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No openings match these filters</p>
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <div className="border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Positions</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Closure deadline</TableHead>
                <TableHead>Candidates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((opening) => {
                const closed = opening.status === "CLOSED";
                const assignedUser = opening.assignedToId
                  ? userById.get(opening.assignedToId)
                  : undefined;
                const passed =
                  opening.closureDeadline && deadlinePassed(opening.closureDeadline);
                return (
                  <TableRow
                    key={opening.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/job-openings/${opening.id}`)}
                  >
                    <TableCell className="font-medium">{opening.title}</TableCell>
                    <TableCell>
                      <Badge variant={closed ? "secondary" : "default"}>
                        {closed ? "Closed" : "Open"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opening.location ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opening.positions}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assignedUser ? assignedUser.name : "Unassigned"}
                    </TableCell>
                    <TableCell className={cn(passed && "font-medium text-destructive")}>
                      {opening.closureDeadline ? (
                        <span className="inline-flex items-center gap-1">
                          {passed && <AlertTriangle className="size-3.5" />}
                          {deadlineFmt.format(new Date(opening.closureDeadline))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opening.stages.length}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((opening) => {
            const counts = countByStage(opening.stages);
            const total = opening.stages.length;
            const closed = opening.status === "CLOSED";
            const assignedUser = opening.assignedToId
              ? userById.get(opening.assignedToId)
              : undefined;

            return (
              <Link key={opening.id} href={`/job-openings/${opening.id}`}>
                <Card
                  className={cn(
                    "h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
                    closed && "opacity-70",
                  )}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold leading-snug">{opening.title}</h2>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {assignedUser ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar size="sm">
                                <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                                  {getInitials(assignedUser.name)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{assignedUser.name}</TooltipContent>
                          </Tooltip>
                        ) : null}
                        <Badge variant={closed ? "secondary" : "default"}>
                          {closed ? "Closed" : "Open"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {opening.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {opening.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {opening.positions}{" "}
                        {opening.positions === 1 ? "position" : "positions"}
                      </span>
                      {opening.closureDeadline && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            deadlinePassed(opening.closureDeadline) &&
                              "font-medium text-destructive",
                          )}
                        >
                          {deadlinePassed(opening.closureDeadline) && (
                            <AlertTriangle className="size-3.5" />
                          )}
                          Closes {deadlineFmt.format(new Date(opening.closureDeadline))}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    {total > 0 ? (
                      <>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                          {ALL_STAGES.filter((s) => counts[s] > 0).map((s) => (
                            <div
                              key={s}
                              className={cn(STAGE_ACCENTS[s].dot)}
                              style={{ width: `${(counts[s] / total) * 100}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {ALL_STAGES.filter((s) => counts[s] > 0).map((s) => (
                            <span key={s} className="inline-flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  STAGE_ACCENTS[s].dot,
                                )}
                              />
                              {STAGE_LABELS[s]} {counts[s]}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No candidates yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function deadlinePassed(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function countByStage(stages: Stage[]): Record<Stage, number> {
  const counts = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
    Stage,
    number
  >;
  for (const s of stages) counts[s]++;
  return counts;
}
