// Unified outbound mail transport. Configuration lives in Settings → Email
// (AppSetting rows) with env vars as the fallback — see lib/settings.ts.
//
// Provider resolution ("auto"): SMTP creds -> smtp; else Graph creds -> graph;
// else console (dev fallback that logs instead of sending).
//
// - smtp   : standard SMTP (e.g. Gmail with an App Password) via nodemailer.
//            Records the SMTP Message-ID; Graph conversationId stays null,
//            which V2 reply-threading tolerates (header-based fallback).
// - graph  : Microsoft 365 via Graph draft+send (captures conversationId).
import { getMailSettings, type MailSettings } from "@/lib/settings";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

export interface MailResult {
  provider: "smtp" | "graph" | "console";
  graphMessageId: string | null;
  conversationId: string | null;
  internetMessageId: string | null;
}

export function smtpConfigured(s: MailSettings): boolean {
  return Boolean(s.smtpHost && s.smtpUser && s.smtpPass);
}

export function graphConfigured(s: MailSettings): boolean {
  return Boolean(s.msTenantId && s.msClientId && s.msClientSecret && s.careersMailbox);
}

export function resolveProvider(s: MailSettings): MailResult["provider"] {
  if (s.provider === "smtp" || s.provider === "graph" || s.provider === "console") {
    return s.provider;
  }
  if (smtpConfigured(s)) return "smtp";
  if (graphConfigured(s)) return "graph";
  return "console";
}

export async function mailProvider(): Promise<MailResult["provider"]> {
  return resolveProvider(await getMailSettings());
}

/** True when emails actually leave the machine. */
export async function mailConfigured(): Promise<boolean> {
  return (await mailProvider()) !== "console";
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const settings = await getMailSettings();
  const provider = resolveProvider(settings);

  if (provider === "smtp") {
    const { sendSmtpMail } = await import("@/lib/email/smtp-send");
    const result = await sendSmtpMail(settings, input);
    return {
      provider,
      graphMessageId: null,
      conversationId: null,
      internetMessageId: result.internetMessageId,
    };
  }

  if (provider === "graph") {
    const { sendGraphMail } = await import("@/lib/email/graph-send");
    const result = await sendGraphMail(settings, input);
    return { provider, ...result };
  }

  console.log(
    `\n[BoonHRM] (dev) email "${input.subject}" -> ${input.to} — no mail provider configured, not actually sent.\n`,
  );
  return {
    provider: "console",
    graphMessageId: null,
    conversationId: null,
    internetMessageId: null,
  };
}
