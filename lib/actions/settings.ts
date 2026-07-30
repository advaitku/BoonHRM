"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { OTP_SETTING_KEYS, SETTING_KEYS, getCompanyName, setSetting } from "@/lib/settings";
import { DEFAULT_TEMPLATES } from "@/lib/email/templates";
import { mailProvider, otpMailProvider, sendMail, sendOtpMail } from "@/lib/email/transport";

export type ActionResult = { ok: true } | { ok: false; error: string };

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const generalSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(120),
  autoRejectDays: z.coerce
    .number()
    .int("Days must be a whole number")
    .min(1, "Minimum 1 day")
    .max(3650, "Maximum 3650 days"),
  notificationEmail: z
    .string()
    .trim()
    .email("Enter a valid notification email")
    .max(200),
  supportEmail: z.preprocess(
    emptyToUndefined,
    z.string().trim().email("Enter a valid support email").max(200).optional(),
  ),
});

export async function saveGeneralSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = generalSchema.safeParse({
    companyName: formData.get("companyName"),
    autoRejectDays: formData.get("autoRejectDays"),
    notificationEmail: formData.get("notificationEmail"),
    supportEmail: formData.get("supportEmail"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await setSetting(SETTING_KEYS.companyName, parsed.data.companyName);
  await setSetting(SETTING_KEYS.autoRejectDays, String(parsed.data.autoRejectDays));
  await setSetting(SETTING_KEYS.notificationEmail, parsed.data.notificationEmail);
  await setSetting(SETTING_KEYS.supportEmail, parsed.data.supportEmail ?? "");
  revalidatePath("/admin/settings");
  return { ok: true };
}

const agreementSchema = z.object({
  agreement: z
    .string()
    .trim()
    .min(1, "Agreement text is required")
    .max(60_000, "Agreement is too long"),
});

export async function saveOfferAgreement(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = agreementSchema.safeParse({ agreement: formData.get("agreement") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await setSetting(SETTING_KEYS.offerAgreement, parsed.data.agreement);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function resetOfferAgreement(): Promise<ActionResult> {
  await requireAdmin();
  await prisma.appSetting.deleteMany({
    where: { key: SETTING_KEYS.offerAgreement },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Outbound email (Settings → Email) --------------------------------------

const emailSettingsSchema = z.object({
  provider: z.enum(["auto", "smtp", "graph", "console"]),
  smtpHost: z.string().trim().max(200),
  smtpPort: z.coerce.number().int().min(1).max(65535).catch(465),
  smtpUser: z.string().trim().max(200),
  // Secrets: empty string = keep the currently stored value.
  smtpPass: z.string().max(200),
  mailFrom: z.string().trim().max(200),
  msTenantId: z.string().trim().max(120),
  msClientId: z.string().trim().max(120),
  msClientSecret: z.string().max(300),
  careersMailbox: z.string().trim().max(200),
});

async function saveMailSettings(
  keys: typeof SETTING_KEYS | typeof OTP_SETTING_KEYS,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = emailSettingsSchema.safeParse({
    provider: formData.get("provider"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpUser: formData.get("smtpUser"),
    smtpPass: formData.get("smtpPass"),
    mailFrom: formData.get("mailFrom"),
    msTenantId: formData.get("msTenantId"),
    msClientId: formData.get("msClientId"),
    msClientSecret: formData.get("msClientSecret"),
    careersMailbox: formData.get("careersMailbox"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  await setSetting(keys.mailProvider, d.provider);
  await setSetting(keys.smtpHost, d.smtpHost);
  await setSetting(keys.smtpPort, String(d.smtpPort));
  await setSetting(keys.smtpUser, d.smtpUser);
  await setSetting(keys.mailFrom, d.mailFrom);
  await setSetting(keys.msTenantId, d.msTenantId);
  await setSetting(keys.msClientId, d.msClientId);
  await setSetting(keys.careersMailbox, d.careersMailbox);
  // Secrets are only overwritten when a new value was typed.
  if (d.smtpPass) await setSetting(keys.smtpPass, d.smtpPass);
  if (d.msClientSecret) await setSetting(keys.msClientSecret, d.msClientSecret);

  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Recruiting mail: interview invite, rejection, approval. */
export async function saveEmailSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  return saveMailSettings(SETTING_KEYS, formData);
}

/** Sign-in / security codes: login OTP, offer-page verification code. */
export async function saveOtpMailSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  return saveMailSettings(OTP_SETTING_KEYS, formData);
}

async function testMail(
  channel: "recruiting" | "otp",
  to: string,
): Promise<{ ok: true; provider: string; to: string } | { ok: false; error: string }> {
  try {
    const provider = channel === "otp" ? await otpMailProvider() : await mailProvider();
    if (provider === "console") {
      return {
        ok: false,
        error:
          "No mail provider is configured for this channel — fill in the SMTP (or Graph) fields and save first.",
      };
    }
    const companyName = await getCompanyName();
    const label = channel === "otp" ? "sign-in / security codes" : "recruiting mail";
    const send = channel === "otp" ? sendOtpMail : sendMail;
    await send({
      to,
      subject: `${companyName} — test email from BoonHRM (${label})`,
      html: `<p>This is a test email from BoonHRM's <strong>${label}</strong> channel.</p><p>Provider: <strong>${provider}</strong> · sent to ${to}.</p><p>If you're reading this, outbound email is working. 🎉</p>`,
      text: `This is a test email from BoonHRM's ${label} channel.\n\nProvider: ${provider} · sent to ${to}.\n\nIf you're reading this, outbound email is working.`,
    });
    return { ok: true, provider, to };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return { ok: false, error: message };
  }
}

export async function sendTestEmail(): Promise<
  { ok: true; provider: string; to: string } | { ok: false; error: string }
> {
  const session = await requireAdmin();
  return testMail("recruiting", session.user.email);
}

export async function sendOtpTestEmail(): Promise<
  { ok: true; provider: string; to: string } | { ok: false; error: string }
> {
  const session = await requireAdmin();
  return testMail("otp", session.user.email);
}

const templateSchema = z.object({
  type: z.enum(["INTERVIEW_INVITE", "REJECTION", "APPROVAL"]),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(10_000),
});

export async function saveEmailTemplate(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = templateSchema.safeParse({
    type: formData.get("type"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { type, subject, body } = parsed.data;
  await prisma.emailTemplate.upsert({
    where: { type },
    create: { type, subject, body },
    update: { subject, body },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function resetEmailTemplate(
  type: "INTERVIEW_INVITE" | "REJECTION" | "APPROVAL",
): Promise<ActionResult> {
  await requireAdmin();
  if (!DEFAULT_TEMPLATES[type]) return { ok: false, error: "Unknown template" };
  await prisma.emailTemplate.deleteMany({ where: { type } });
  revalidatePath("/admin/settings");
  return { ok: true };
}
