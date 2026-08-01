"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Briefcase,
  ListFilter,
  Search,
  SearchX,
  X,
} from "lucide-react";

import { ALL_STAGES, STAGE_LABELS } from "@/lib/stages";
import type { Stage } from "@/lib/generated/prisma/enums";
import { getInitials } from "@/lib/initials";
import { StageBadge } from "@/components/candidates/stage-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export interface CandidateApplicationRef {
  id: string;
  stage: Stage;
  openingId: string;
  openingTitle: string;
}

export interface CandidateRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  applications: CandidateApplicationRef[];
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type SortKey = "recent" | "newest" | "name" | "applications";

export function CandidatesTable({ candidates }: { candidates: CandidateRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [opening, setOpening] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Only offer openings that actually have candidates — a filter that can
  // never match is worse than no filter.
  const openings = useMemo(() => {
    const byId = new Map<string, string>();
    for (const c of candidates) {
      for (const a of c.applications) byId.set(a.openingId, a.openingTitle);
    }
    return [...byId].map(([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [candidates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = candidates;

    if (q) {
      list = list.filter((c) =>
        [c.fullName, c.email, c.phone].some((f) => f?.toLowerCase().includes(q)),
      );
    }
    if (stage !== "all") {
      list = list.filter((c) => c.applications.some((a) => a.stage === stage));
    }
    if (opening === "none") {
      list = list.filter((c) => c.applications.length === 0);
    } else if (opening !== "all") {
      list = list.filter((c) => c.applications.some((a) => a.openingId === opening));
    }

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "name":
        sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
        break;
      case "applications":
        sorted.sort((a, b) => b.applications.length - a.applications.length);
        break;
      case "recent":
      default:
        sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
    }
    return sorted;
  }, [candidates, query, stage, opening, sort]);

  const filtersActive = Boolean(query) || stage !== "all" || opening !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or phone…"
            className="bg-background pl-9"
          />
        </div>

        <Select value={stage} onValueChange={(v) => setStage(v as "all" | Stage)}>
          <SelectTrigger className="w-40 bg-background">
            <ListFilter className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {ALL_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={opening} onValueChange={setOpening}>
          <SelectTrigger className="w-52 bg-background">
            <Briefcase className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All openings</SelectItem>
            <SelectItem value="none">No application</SelectItem>
            {openings.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-48 bg-background">
            <ArrowUpDown className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent activity</SelectItem>
            <SelectItem value="newest">Newest added</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="applications">Most applications</SelectItem>
          </SelectContent>
        </Select>

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setQuery("");
              setStage("all");
              setOpening("all");
            }}
          >
            <X />
            Reset
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {visible.length} of {candidates.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <SearchX className="size-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No candidates match these filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/candidates/${c.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(c.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{c.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email || c.phone ? (
                      <div className="flex flex-col text-sm">
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.applications.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {c.applications.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-2 text-sm"
                          >
                            {/* Stop propagation so the opening link wins over the row click */}
                            <Link
                              href={`/job-openings/${a.openingId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              {a.openingTitle}
                            </Link>
                            <StageBadge stage={a.stage} />
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFmt.format(new Date(c.createdAt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFmt.format(new Date(c.updatedAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
