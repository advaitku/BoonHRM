import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS } from "@/lib/stages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageBadge } from "@/components/candidates/stage-badge";
import { CandidateActions } from "@/components/candidates/candidate-actions";
import { CandidateProfileForm } from "@/components/candidates/candidate-profile-form";
import { ResumePanel } from "@/components/candidates/resume-panel";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      jobOpening: { select: { id: true, title: true, location: true } },
      stageHistory: { orderBy: { createdAt: "desc" } },
      emailThread: {
        include: { messages: { orderBy: { occurredAt: "desc" } } },
      },
    },
  });
  if (!candidate) notFound();

  const movers = await prisma.user.findMany({
    where: {
      id: {
        in: candidate.stageHistory
          .map((h) => h.movedById)
          .filter((v): v is string => Boolean(v)),
      },
    },
    select: { id: true, name: true },
  });
  const moverName = (mid: string | null) =>
    mid ? (movers.find((m) => m.id === mid)?.name ?? "Unknown") : "System";

  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const daysInStage = Math.floor(
    (Date.now() - candidate.stageEnteredAt.getTime()) / 86_400_000,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
          >
            <Link href={`/job-openings/${candidate.jobOpening.id}`}>
              <ArrowLeft className="size-4" />
              {candidate.jobOpening.title}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {candidate.fullName}
            </h1>
            <StageBadge stage={candidate.stage} />
          </div>
          <p className="text-sm text-muted-foreground">
            In {STAGE_LABELS[candidate.stage]} for{" "}
            {daysInStage === 0 ? "less than a day" : `${daysInStage} day(s)`} ·
            added {dateFmt.format(candidate.createdAt)}
          </p>
        </div>
        <CandidateActions candidateId={candidate.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="emails">
                Emails
                {candidate.emailThread?.messages.length ? (
                  <Badge variant="secondary" className="ml-1.5">
                    {candidate.emailThread.messages.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <CandidateProfileForm
                    candidateId={candidate.id}
                    initial={{
                      fullName: candidate.fullName,
                      email: candidate.email ?? "",
                      phone: candidate.phone ?? "",
                      address: candidate.address ?? "",
                      workHistory: candidate.workHistory ?? "",
                      education: candidate.education ?? "",
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume" className="mt-4">
              <ResumePanel
                candidateId={candidate.id}
                hasResume={Boolean(candidate.resumeFilePath)}
                resumeMime={candidate.resumeMime}
                resumeOriginalName={candidate.resumeOriginalName}
                extractedText={candidate.extractedResumeText}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stage history</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-6 border-l pl-6">
                    {candidate.stageHistory.map((h) => (
                      <li key={h.id} className="relative">
                        <span className="absolute -left-[30.5px] top-1 size-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                        <p className="text-sm font-medium">
                          {h.fromStage
                            ? `${STAGE_LABELS[h.fromStage]} → ${STAGE_LABELS[h.toStage]}`
                            : `Added to ${STAGE_LABELS[h.toStage]}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateTimeFmt.format(h.createdAt)} · by {moverName(h.movedById)}
                        </p>
                        {h.rejectionType && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {h.rejectionType === "CANDIDATE_DECLINED"
                              ? "Candidate declined"
                              : "Rejected by company"}
                            {h.rejectionReason ? ` — ${h.rejectionReason}` : ""}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              {candidate.emailThread?.messages.length ? (
                <div className="space-y-3">
                  {candidate.emailThread.messages.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="space-y-1 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{m.subject}</p>
                          <Badge variant="outline">
                            {m.mailType.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.direction === "OUTBOUND" ? "Sent" : "Received"}{" "}
                          {dateTimeFmt.format(m.occurredAt)}
                          {m.toAddresses ? ` · to ${m.toAddresses}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No emails yet. Interview invites, rejection and approval
                    emails sent to this candidate appear here.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                {candidate.email ? (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="truncate hover:underline"
                  >
                    {candidate.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No email</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                {candidate.phone ? (
                  <span>{candidate.phone}</span>
                ) : (
                  <span className="text-muted-foreground">No phone</span>
                )}
              </div>
              {candidate.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="whitespace-pre-wrap">{candidate.address}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 shrink-0 text-muted-foreground" />
                <Link
                  href={`/job-openings/${candidate.jobOpening.id}`}
                  className="truncate hover:underline"
                >
                  {candidate.jobOpening.title}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Added {dateFmt.format(candidate.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {candidate.stage === "REJECTED" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  {candidate.rejectionType === "CANDIDATE_DECLINED"
                    ? "Candidate declined"
                    : "Rejected by company"}
                  {candidate.rejectedAt
                    ? ` on ${dateFmt.format(candidate.rejectedAt)}`
                    : ""}
                </p>
                {candidate.rejectionReason && (
                  <p className="text-muted-foreground">{candidate.rejectionReason}</p>
                )}
              </CardContent>
            </Card>
          )}

          {candidate.stage === "APPROVED" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approval</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Approved
                  {candidate.approvedAt
                    ? ` on ${dateFmt.format(candidate.approvedAt)}`
                    : ""}
                </p>
                {candidate.ctcDetails && (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {candidate.ctcDetails}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
