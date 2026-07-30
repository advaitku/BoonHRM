import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  SETTING_KEYS,
  getAutoRejectDays,
  getCompanyName,
  getMailSettings,
  getNotificationEmail,
  getOfferAgreement,
  getOtpMailSettings,
  getSetting,
  getSupportEmail,
} from "@/lib/settings";
import { resolveProvider } from "@/lib/email/transport";
import { TEMPLATE_META, getTemplateForEditing } from "@/lib/email/templates";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { OfferAgreementForm } from "@/components/settings/offer-agreement-form";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRowActions } from "@/components/admin/user-row-actions";

export default async function SettingsPage() {
  const session = await requireAdmin();

  const [
    companyName,
    autoRejectDays,
    notificationEmail,
    supportEmail,
    offerAgreement,
    customAgreement,
    mailSettings,
    otpMailSettings,
    users,
    invite,
    rejection,
    approval,
  ] = await Promise.all([
    getCompanyName(),
    getAutoRejectDays(),
    getNotificationEmail(),
    getSupportEmail(),
    getOfferAgreement(),
    getSetting(SETTING_KEYS.offerAgreement),
    getMailSettings(),
    getOtpMailSettings(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getTemplateForEditing("INTERVIEW_INVITE"),
    getTemplateForEditing("REJECTION"),
    getTemplateForEditing("APPROVAL"),
  ]);

  const templates = [invite, rejection, approval];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Workspace configuration — visible to admins only.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="otp-email">Sign-in codes</TabsTrigger>
          <TabsTrigger value="templates">Email templates</TabsTrigger>
          <TabsTrigger value="offer">Offer page</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>
                Company identity and pipeline automation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettingsForm
                companyName={companyName}
                autoRejectDays={autoRejectDays}
                notificationEmail={notificationEmail}
                supportEmail={supportEmail}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Team members sign in with a one-time email code — no passwords.
            </p>
            <CreateUserForm />
          </div>
          <div className="border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "Admin" : "HR"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.banned ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserRowActions
                        userId={u.id}
                        role={u.role}
                        banned={u.banned}
                        isSelf={u.id === session.user.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outbound email — recruiting</CardTitle>
              <CardDescription>
                How BoonHRM sends candidate-facing mail (interview invite,
                rejection, approval). Independent from sign-in codes, below —
                values saved here override the server&apos;s environment
                variables for this channel only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSettingsForm
                channel="recruiting"
                initial={{
                  provider: mailSettings.provider,
                  activeProvider: resolveProvider(mailSettings),
                  smtpHost: mailSettings.smtpHost,
                  smtpPort: mailSettings.smtpPort,
                  smtpUser: mailSettings.smtpUser,
                  hasSmtpPass: Boolean(mailSettings.smtpPass),
                  mailFrom: mailSettings.mailFrom,
                  msTenantId: mailSettings.msTenantId,
                  msClientId: mailSettings.msClientId,
                  hasMsClientSecret: Boolean(mailSettings.msClientSecret),
                  careersMailbox: mailSettings.careersMailbox,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="otp-email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outbound email — sign-in codes</CardTitle>
              <CardDescription>
                How BoonHRM sends the login OTP and the offer-page
                verification code. Kept independent from recruiting mail
                above, so changing where candidate emails go (e.g. switching
                to Amazon SES) can never accidentally break sign-in. Unset
                fields here fall back to the same environment variables as
                recruiting mail until configured separately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSettingsForm
                channel="otp"
                initial={{
                  provider: otpMailSettings.provider,
                  activeProvider: resolveProvider(otpMailSettings),
                  smtpHost: otpMailSettings.smtpHost,
                  smtpPort: otpMailSettings.smtpPort,
                  smtpUser: otpMailSettings.smtpUser,
                  hasSmtpPass: Boolean(otpMailSettings.smtpPass),
                  mailFrom: otpMailSettings.mailFrom,
                  msTenantId: otpMailSettings.msTenantId,
                  msClientId: otpMailSettings.msClientId,
                  hasMsClientSecret: Boolean(otpMailSettings.msClientSecret),
                  careersMailbox: otpMailSettings.careersMailbox,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          {templates.map((t) => (
            <EmailTemplateEditor
              key={t.type}
              type={t.type}
              label={TEMPLATE_META[t.type].label}
              description={TEMPLATE_META[t.type].description}
              placeholders={TEMPLATE_META[t.type].placeholders}
              subject={t.subject}
              body={t.body}
              isCustomized={t.isCustomized}
            />
          ))}
        </TabsContent>

        <TabsContent value="offer" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Offer agreement</CardTitle>
              <CardDescription>
                Shown to candidates on the public offer page, below their offer
                details. Candidates agree to this text when they accept.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OfferAgreementForm
                agreement={offerAgreement}
                isCustomized={customAgreement !== null}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
