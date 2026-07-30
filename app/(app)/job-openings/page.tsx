import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobOpeningsBoard } from "@/components/job-openings/job-openings-board";

export default async function JobOpeningsPage() {
  await requireUser();

  const [openings, teamUsers] = await Promise.all([
    prisma.jobOpening.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        applications: { select: { stage: true } },
      },
    }),
    prisma.user.findMany({
      where: { banned: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Openings</h1>
          <p className="text-muted-foreground">
            {openings.length === 0
              ? "Create your first opening to start tracking candidates."
              : `${openings.filter((o) => o.status === "OPEN").length} open · ${openings.filter((o) => o.status === "CLOSED").length} closed`}
          </p>
        </div>
        <Button asChild>
          <Link href="/job-openings/new">
            <Plus className="size-4" />
            New opening
          </Link>
        </Button>
      </div>

      {openings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Briefcase className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No job openings yet</p>
              <p className="text-sm text-muted-foreground">
                Each opening gets its own Kanban board of candidates.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/job-openings/new">
                <Plus className="size-4" />
                Create the first opening
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <JobOpeningsBoard
          openings={openings.map((o) => ({
            id: o.id,
            title: o.title,
            location: o.location,
            positions: o.positions,
            status: o.status,
            createdAt: o.createdAt.toISOString(),
            assignedToId: o.assignedToId,
            closureDeadline: o.closureDeadline ? o.closureDeadline.toISOString() : null,
            stages: o.applications.map((a) => a.stage),
          }))}
          users={teamUsers}
        />
      )}
    </div>
  );
}
