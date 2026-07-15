"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { saveEmailSettings, sendTestEmail } from "@/lib/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface EmailSettingsValues {
  provider: "auto" | "smtp" | "graph" | "console";
  activeProvider: "smtp" | "graph" | "console"; // resolved, for the status badge
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hasSmtpPass: boolean;
  mailFrom: string;
  msTenantId: string;
  msClientId: string;
  hasMsClientSecret: boolean;
  careersMailbox: string;
}

export function EmailSettingsForm({ initial }: { initial: EmailSettingsValues }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.provider);
  const [pending, startTransition] = useTransition();
  const [testing, startTesting] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("provider", provider);
    startTransition(async () => {
      const result = await saveEmailSettings(formData);
      if (result.ok) {
        toast.success("Email settings saved");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onTest() {
    startTesting(async () => {
      const result = await sendTestEmail();
      if (result.ok) {
        toast.success(`Test email sent to ${result.to} via ${result.provider}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  const showSmtp = provider === "auto" || provider === "smtp";
  const showGraph = provider === "auto" || provider === "graph";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs space-y-2">
          <Label>Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as typeof provider)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect (recommended)</SelectItem>
              <SelectItem value="smtp">Gmail / SMTP</SelectItem>
              <SelectItem value="graph">Microsoft 365 (Graph)</SelectItem>
              <SelectItem value="console">Console (dev — don&apos;t send)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Currently active:{" "}
            <Badge
              variant={initial.activeProvider === "console" ? "destructive" : "secondary"}
              className="align-middle"
            >
              {initial.activeProvider === "console"
                ? "console — emails are NOT sent"
                : initial.activeProvider}
            </Badge>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onTest}
          disabled={testing || pending}
        >
          <Send className="size-4" />
          {testing ? "Sending…" : "Send test email to me"}
        </Button>
      </div>

      {showSmtp && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Gmail / SMTP</h3>
              <p className="text-xs text-muted-foreground">
                For Gmail: enable 2-Step Verification, then create an App
                Password (myaccount.google.com/apppasswords) and use it below.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP host</Label>
                <Input
                  id="smtpHost"
                  name="smtpHost"
                  placeholder="smtp.gmail.com"
                  defaultValue={initial.smtpHost}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  name="smtpPort"
                  type="number"
                  min={1}
                  max={65535}
                  defaultValue={initial.smtpPort}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Email address (SMTP user)</Label>
                <Input
                  id="smtpUser"
                  name="smtpUser"
                  type="email"
                  placeholder="recruiting@yourcompany.com"
                  defaultValue={initial.smtpUser}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">App password</Label>
                <Input
                  id="smtpPass"
                  name="smtpPass"
                  type="password"
                  placeholder={initial.hasSmtpPass ? "•••••••• (saved — leave blank to keep)" : "16-character app password"}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mailFrom">From (display)</Label>
                <Input
                  id="mailFrom"
                  name="mailFrom"
                  placeholder="Boon Recruitment <recruiting@yourcompany.com>"
                  defaultValue={initial.mailFrom}
                />
                <p className="text-xs text-muted-foreground">
                  Gmail always sends from the authenticated account; this sets
                  the display name.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {showGraph && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Microsoft 365 (Graph)</h3>
              <p className="text-xs text-muted-foreground">
                For later — needs an Azure app registration (docs/M365-SETUP.md).
                Enables reply-threading in V2.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="msTenantId">Tenant ID</Label>
                <Input
                  id="msTenantId"
                  name="msTenantId"
                  defaultValue={initial.msTenantId}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="msClientId">Client ID</Label>
                <Input
                  id="msClientId"
                  name="msClientId"
                  defaultValue={initial.msClientId}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="msClientSecret">Client secret</Label>
                <Input
                  id="msClientSecret"
                  name="msClientSecret"
                  type="password"
                  placeholder={initial.hasMsClientSecret ? "•••••••• (saved — leave blank to keep)" : ""}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="careersMailbox">Sender mailbox</Label>
                <Input
                  id="careersMailbox"
                  name="careersMailbox"
                  type="email"
                  placeholder="careers@yourcompany.com"
                  defaultValue={initial.careersMailbox}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden fields so unsaved sections don't wipe stored values */}
      {!showSmtp && (
        <>
          <input type="hidden" name="smtpHost" value={initial.smtpHost} />
          <input type="hidden" name="smtpPort" value={initial.smtpPort} />
          <input type="hidden" name="smtpUser" value={initial.smtpUser} />
          <input type="hidden" name="mailFrom" value={initial.mailFrom} />
        </>
      )}
      {!showGraph && (
        <>
          <input type="hidden" name="msTenantId" value={initial.msTenantId} />
          <input type="hidden" name="msClientId" value={initial.msClientId} />
          <input type="hidden" name="careersMailbox" value={initial.careersMailbox} />
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save email settings"}
        </Button>
      </div>
    </form>
  );
}
