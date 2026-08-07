import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  Briefcase,
  Clock,
  Mail,
  Send,
  Users as UsersIcon,
} from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  SETTING_KEYS,
  getAutoRejectDays,
  getCompanyName,
  getMailSettings,
  getNotificationEmail,
  getOtpMailSettings,
  getSetting,
  getSupportEmail,
} from "@/lib/settings";
import { resolveProvider } from "@/lib/email/transport";
import { getTemplateForEditing } from "@/lib/email/templates";
import { STAGE_LABELS } from "@/lib/stages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACTIVITY_LIMIT = 50;
const EMAIL_LIMIT = 50;

/** Super-admin-only platform view: recent workflow activity and email traffic
 * across every opening, plus a read-only configuration overview. Lives outside
 * the (app) shell on purpose — single-workspace today, this becomes the
 * cross-company operator console when BoonHRM goes multi-tenant. */
export default async function CommandCenterPage() {
  await requireSuperAdmin();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    openOpenings,
    totalCandidates,
    activeApplications,
    emailsLast30,
    pendingOffers,
    acceptedApplications,
    stageMoves,
    emails,
    companyName,
    autoRejectDays,
    notificationEmail,
    supportEmail,
    customAgreement,
    mailSettings,
    otpMailSettings,
    users,
    inviteTemplate,
    rejectionTemplate,
    approvalTemplate,
  ] = await Promise.all([
    prisma.jobOpening.count({ where: { status: "OPEN" } }),
    prisma.candidate.count(),
    prisma.application.count({ where: { stage: { notIn: ["REJECTED"] } } }),
    prisma.emailMessage.count({ where: { occurredAt: { gte: thirtyDaysAgo } } }),
    prisma.application.count({
      where: {
        stage: "APPROVED",
        offerAcceptedAt: null,
        offerDeclinedAt: null,
        offerTokenExpiresAt: { gt: now },
      },
    }),
    prisma.application.count({ where: { offerAcceptedAt: { not: null } } }),
    prisma.applicationStageHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      include: {
        application: {
          select: {
            candidate: { select: { id: true, fullName: true } },
            jobOpening: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.emailMessage.findMany({
      orderBy: { occurredAt: "desc" },
      take: EMAIL_LIMIT,
      include: {
        emailThread: {
          select: {
            application: {
              select: {
                candidate: { select: { id: true, fullName: true } },
                jobOpening: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    }),
    getCompanyName(),
    getAutoRejectDays(),
    getNotificationEmail(),
    getSupportEmail(),
    getSetting(SETTING_KEYS.offerAgreement),
    getMailSettings(),
    getOtpMailSettings(),
    prisma.user.findMany({
      select: { id: true, name: true, role: true, banned: true },
    }),
    getTemplateForEditing("INTERVIEW_INVITE"),
    getTemplateForEditing("REJECTION"),
    getTemplateForEditing("APPROVAL"),
  ]);

  // movedById is a plain scalar (no FK) — resolve names in one extra query,
  // same pattern as the candidate detail page.
  const moverIds = [
    ...new Set(
      stageMoves.map((h) => h.movedById).filter((id): id is string => !!id),
    ),
  ];
  const movers = users.filter((u) => moverIds.includes(u.id));
  const userName = (uid: string | null) =>
    uid ? (movers.find((m) => m.id === uid)?.name ?? "Unknown") : "System";

  const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const recruitingProvider = resolveProvider(mailSettings);
  const otpProvider = resolveProvider(otpMailSettings);
  const templates = [inviteTemplate, rejectionTemplate, approvalTemplate];
  const adminCount = users.filter((u) => u.role === "admin").length;
  const disabledCount = users.filter((u) => u.banned).length;

  const metrics = [
    { icon: Briefcase, label: "Open openings", value: openOpenings },
    { icon: UsersIcon, label: "Candidates", value: totalCandidates },
    { icon: Activity, label: "Active applications", value: activeApplications },
    { icon: Send, label: "Emails (30d)", value: emailsLast30 },
    { icon: Clock, label: "Offers awaiting reply", value: pendingOffers },
    { icon: BadgeCheck, label: "Offers accepted", value: acceptedApplications },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Platform overview</h1>
          <p className="text-muted-foreground">
            Global workflow activity, email traffic and configuration across
            the workspace.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings">Open Settings</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="bg-muted p-2.5">
                <m.icon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">{m.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Workflow activity</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="settings">Settings overview</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent stage moves</CardTitle>
              <CardDescription>
                The last {ACTIVITY_LIMIT} pipeline moves across every opening,
                newest first. System moves (auto-reject, offer expiry, candidate
                decline) show as &ldquo;System&rdquo;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stageMoves.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No pipeline activity yet.
                </p>
              ) : (
                <ol className="relative space-y-6 border-l pl-6">
                  {stageMoves.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[30.5px] top-1 size-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                      <p className="text-sm font-medium">
                        {h.fromStage
                          ? `${STAGE_LABELS[h.fromStage]} → ${STAGE_LABELS[h.toStage]}`
                          : `Added to ${STAGE_LABELS[h.toStage]}`}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          ·{" "}
                          <Link
                            href={`/candidates/${h.application.candidate.id}`}
                            className="hover:underline"
                          >
                            {h.application.candidate.fullName}
                          </Link>{" "}
                          ·{" "}
                          <Link
                            href={`/job-openings/${h.application.jobOpening.id}`}
                            className="hover:underline"
                          >
                            {h.application.jobOpening.title}
                          </Link>
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateTimeFmt.format(h.createdAt)} · by{" "}
                        {userName(h.movedById)}
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
          {emails.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No emails logged yet. Interview invites, rejections and approval
                emails across all candidates appear here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {emails.map((m) => {
                const application = m.emailThread.application;
                return (
                  <Card key={m.id}>
                    <CardContent className="space-y-1 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{m.subject}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge variant="secondary">
                            {application.jobOpening.title}
                          </Badge>
                          <Badge variant="outline">
                            {m.mailType.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.direction === "OUTBOUND" ? "Sent" : "Received"}{" "}
                        {dateTimeFmt.format(m.occurredAt)}
                        {m.toAddresses ? ` · to ${m.toAddresses}` : ""} ·{" "}
                        <Link
                          href={`/candidates/${application.candidate.id}`}
                          className="hover:underline"
                        >
                          {application.candidate.fullName}
                        </Link>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General</CardTitle>
                <CardDescription>
                  Edit under{" "}
                  <Link href="/admin/settings" className="underline">
                    Settings → General
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Company name</dt>
                  <dd>{companyName}</dd>
                  <dt className="text-muted-foreground">Auto-reject after</dt>
                  <dd>{autoRejectDays} days in a stage</dd>
                  <dt className="text-muted-foreground">HR notifications</dt>
                  <dd className="break-all">{notificationEmail}</dd>
                  <dt className="text-muted-foreground">Support email</dt>
                  <dd className="break-all">
                    {supportEmail || (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </dd>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email delivery</CardTitle>
                <CardDescription>
                  Edit under{" "}
                  <Link href="/admin/settings" className="underline">
                    Settings → Email / Sign-in codes
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Recruiting mail</span>
                  <ProviderBadge provider={recruitingProvider} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Sign-in codes</span>
                  <ProviderBadge provider={otpProvider} />
                </div>
                {(recruitingProvider === "console" ||
                  otpProvider === "console") && (
                  <p className="pt-1 text-xs text-destructive">
                    &ldquo;Console&rdquo; means mail is only printed to the
                    server log, not actually delivered.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customization</CardTitle>
                <CardDescription>
                  Edit under{" "}
                  <Link href="/admin/settings" className="underline">
                    Settings → Email templates / Offer page
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                  {templates.map((t) => (
                    <CustomizedRow
                      key={t.type}
                      label={`${t.type.replace(/_/g, " ").toLowerCase()} email`}
                      customized={t.isCustomized}
                    />
                  ))}
                  <CustomizedRow
                    label="Offer page terms & agreement"
                    customized={customAgreement !== null}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team</CardTitle>
                <CardDescription>
                  Edit under{" "}
                  <Link href="/admin/settings" className="underline">
                    Settings → Users
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Members</dt>
                  <dd>{users.length}</dd>
                  <dt className="text-muted-foreground">Admins</dt>
                  <dd>{adminCount}</dd>
                  <dt className="text-muted-foreground">HR</dt>
                  <dd>{users.length - adminCount}</dd>
                  <dt className="text-muted-foreground">Disabled</dt>
                  <dd>{disabledCount}</dd>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderBadge({
  provider,
}: {
  provider: "smtp" | "graph" | "console";
}) {
  if (provider === "console") {
    return <Badge variant="destructive">Console (not sending)</Badge>;
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Mail className="size-3" />
      {provider === "smtp" ? "Gmail / SMTP" : "Microsoft 365"}
    </Badge>
  );
}

function CustomizedRow({
  label,
  customized,
}: {
  label: string;
  customized: boolean;
}) {
  return (
    <>
      <dt className="capitalize text-muted-foreground">{label}</dt>
      <dd>
        {customized ? (
          <Badge variant="secondary">Customized</Badge>
        ) : (
          <Badge variant="outline">Default</Badge>
        )}
      </dd>
    </>
  );
}
