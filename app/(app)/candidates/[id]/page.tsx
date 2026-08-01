import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOfferState, offerUrl } from "@/lib/offer";
import { STAGE_LABELS } from "@/lib/stages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateActions } from "@/components/candidates/candidate-actions";
import { CandidateProfileForm } from "@/components/candidates/candidate-profile-form";
import { ResumePanel } from "@/components/candidates/resume-panel";
import { CandidateTags } from "@/components/candidates/candidate-tags";
import { CommentsPanel } from "@/components/candidates/comments-panel";
import {
  ApplicationsPanel,
  type ApplicationRow,
} from "@/components/candidates/applications-panel";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          jobOpening: true,
          stageHistory: { orderBy: { createdAt: "desc" } },
          emailThread: {
            include: { messages: { orderBy: { occurredAt: "desc" } } },
          },
          offerAcceptances: { orderBy: { acceptedAt: "desc" }, take: 1 },
        },
      },
      comments: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
      resumes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!candidate) notFound();

  const allTags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  const userIds = new Set<string>();
  for (const a of candidate.applications)
    for (const h of a.stageHistory) if (h.movedById) userIds.add(h.movedById);
  for (const c of candidate.comments) if (c.authorId) userIds.add(c.authorId);
  const teamUsers = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true },
  });
  const userName = (uid: string | null) =>
    uid ? (teamUsers.find((m) => m.id === uid)?.name ?? "Unknown") : "System";

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

  // Stage history + emails across every application, labeled by opening.
  const history = candidate.applications
    .flatMap((a) =>
      a.stageHistory.map((h) => ({ ...h, openingTitle: a.jobOpening.title })),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const messages = candidate.applications
    .flatMap(
      (a) =>
        a.emailThread?.messages.map((m) => ({
          ...m,
          openingTitle: a.jobOpening.title,
        })) ?? [],
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const applicationRows: ApplicationRow[] = candidate.applications.map((a) => {
    const offerState = a.stage === "APPROVED" ? getOfferState(a) : null;
    // Latest acceptance snapshot — kept visible regardless of current stage,
    // since it's the audit record of what the candidate agreed to.
    const acceptance = a.offerAcceptances[0] ?? null;
    return {
      id: a.id,
      stage: a.stage,
      stageEnteredAt: a.stageEnteredAt.toISOString(),
      rejectionType: a.rejectionType,
      rejectionReason: a.rejectionReason,
      offerState,
      offerUrl:
        offerState === "pending" && a.offerToken ? offerUrl(a.offerToken) : null,
      acceptedOffer: acceptance
        ? {
            acceptedAt: acceptance.acceptedAt.toISOString(),
            jobTitle: acceptance.jobTitle,
            companyName: acceptance.companyName,
            candidateEmail: acceptance.candidateEmail,
            location: acceptance.location,
            ctcDetails: acceptance.ctcDetails,
            dateOfJoining: acceptance.dateOfJoining
              ? acceptance.dateOfJoining.toISOString().slice(0, 10)
              : null,
            agreementText: acceptance.agreementText,
          }
        : null,
      opening: {
        id: a.jobOpening.id,
        title: a.jobOpening.title,
        onlineInterviewUrl: a.jobOpening.onlineInterviewUrl,
        inPersonInterviewUrl: a.jobOpening.inPersonInterviewUrl,
        autoNotify: a.jobOpening.autoNotify,
      },
    };
  });

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
            <Link href="/job-openings">
              <ArrowLeft className="size-4" />
              All openings
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {candidate.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {candidate.applications.length}{" "}
            {candidate.applications.length === 1 ? "application" : "applications"} ·
            added {dateFmt.format(candidate.createdAt)}
          </p>
          <CandidateTags
            candidateId={candidate.id}
            tags={candidate.tags.map((t) => ({
              id: t.tag.id,
              name: t.tag.name,
              color: t.tag.color,
            }))}
            suggestions={allTags.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            }))}
          />
        </div>
        <CandidateActions candidateId={candidate.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ApplicationsPanel
            subject={{ fullName: candidate.fullName, email: candidate.email }}
            applications={applicationRows}
          />

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="resume">
                Resume
                {candidate.resumes.length ? (
                  <Badge variant="secondary" className="ml-1.5">
                    {candidate.resumes.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity
                {candidate.comments.length ? (
                  <Badge variant="secondary" className="ml-1.5">
                    {candidate.comments.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="emails">
                Emails
                {messages.length ? (
                  <Badge variant="secondary" className="ml-1.5">
                    {messages.length}
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
                resumes={candidate.resumes.map((r) => ({
                  id: r.id,
                  mime: r.mime,
                  originalName: r.originalName,
                  extractedText: r.extractedText,
                  createdAt: r.createdAt.toISOString(),
                }))}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4 space-y-6">
              <CommentsPanel
                candidateId={candidate.id}
                currentUserId={session.user.id}
                isAdmin={session.user.role === "admin"}
                comments={candidate.comments.map((c) => ({
                  id: c.id,
                  body: c.body,
                  authorId: c.authorId,
                  authorName: userName(c.authorId),
                  createdAt: c.createdAt.toISOString(),
                }))}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stage history</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      No stage moves yet.
                    </p>
                  ) : (
                    <ol className="relative space-y-6 border-l pl-6">
                      {history.map((h) => (
                        <li key={h.id} className="relative">
                          <span className="absolute -left-[30.5px] top-1 size-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                          <p className="text-sm font-medium">
                            {h.fromStage
                              ? `${STAGE_LABELS[h.fromStage]} → ${STAGE_LABELS[h.toStage]}`
                              : `Added to ${STAGE_LABELS[h.toStage]}`}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              · {h.openingTitle}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dateTimeFmt.format(h.createdAt)} · by {userName(h.movedById)}
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              {messages.length ? (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="space-y-1 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{m.subject}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary">{m.openingTitle}</Badge>
                            <Badge variant="outline">
                              {m.mailType.replace(/_/g, " ").toLowerCase()}
                            </Badge>
                          </div>
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
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Added {dateFmt.format(candidate.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
