import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CandidatesTable } from "@/components/candidates/candidates-table";

export default async function CandidatesPage() {
  await requireUser();

  const candidates = await prisma.candidate.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: { jobOpening: { select: { id: true, title: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground">
          {candidates.length === 0
            ? "Candidates appear here once they're added to an opening."
            : `Every person on file — one row per candidate, across all openings.`}
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Users className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No candidates yet</p>
              <p className="text-sm text-muted-foreground">
                Add candidates from a job opening&apos;s board.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CandidatesTable
          candidates={candidates.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            applications: c.applications.map((a) => ({
              id: a.id,
              stage: a.stage,
              openingId: a.jobOpening.id,
              openingTitle: a.jobOpening.title,
            })),
          }))}
        />
      )}
    </div>
  );
}
