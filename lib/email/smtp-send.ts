// Standard SMTP sender (nodemailer) — used for Gmail with an App Password.
// Config comes from Settings → Email (env fallback); see docs/GMAIL-SETUP.md.
// Gmail rewrites the From to the authenticated account, so mailFrom mainly
// sets the display name.
import nodemailer from "nodemailer";
import type { MailSettings } from "@/lib/settings";
import { getCompanyName } from "@/lib/settings";

export interface SmtpSendResult {
  internetMessageId: string | null;
}

export async function sendSmtpMail(
  settings: MailSettings,
  input: { to: string; subject: string; html: string },
): Promise<SmtpSendResult> {
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    throw new Error("SMTP is not configured (host/user/password missing)");
  }

  // Low volume — a fresh transport per send keeps config changes instant.
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // 465 = implicit TLS; 587 uses STARTTLS
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });

  const from =
    settings.mailFrom ||
    `${await getCompanyName()} <${settings.smtpUser}>`;

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  // nodemailer returns the RFC 5322 Message-ID (e.g. "<abc@gmail.com>").
  return { internetMessageId: info.messageId ?? null };
}
