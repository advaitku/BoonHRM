import { prisma } from "@/lib/prisma";

// Admin-editable app settings, stored as key/value rows with env fallbacks.
export const SETTING_KEYS = {
  companyName: "companyName",
  autoRejectDays: "autoRejectDays",
  notificationEmail: "notificationEmail",
  supportEmail: "supportEmail",
  offerAgreement: "offerAgreement",
  // Outbound email (Settings → Email); env vars are the fallback.
  mailProvider: "mailProvider",
  smtpHost: "smtpHost",
  smtpPort: "smtpPort",
  smtpUser: "smtpUser",
  smtpPass: "smtpPass",
  mailFrom: "mailFrom",
  msTenantId: "msTenantId",
  msClientId: "msClientId",
  msClientSecret: "msClientSecret",
  careersMailbox: "careersMailbox",
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getCompanyName(): Promise<string> {
  return (
    (await getSetting(SETTING_KEYS.companyName)) ||
    process.env.COMPANY_NAME ||
    "Boon"
  );
}

export async function getAutoRejectDays(): Promise<number> {
  const raw =
    (await getSetting(SETTING_KEYS.autoRejectDays)) ||
    process.env.AUTO_REJECT_DAYS ||
    "75";
  const days = Number(raw);
  return Number.isFinite(days) && days >= 1 ? Math.floor(days) : 75;
}

/** Internal inbox for offer accept/decline notifications. */
export async function getNotificationEmail(): Promise<string> {
  return (
    (await getSetting(SETTING_KEYS.notificationEmail)) ||
    process.env.NOTIFICATION_EMAIL ||
    "hr@helloboon.com"
  );
}

/** Shown to candidates in the auto-generated-email footer of every outbound mail. */
export async function getSupportEmail(): Promise<string> {
  return (
    (await getSetting(SETTING_KEYS.supportEmail)) ||
    process.env.SUPPORT_EMAIL ||
    ""
  );
}

// Shown on the public offer page below the offer details. Admin-editable
// (Settings → Offer page); this is the fallback until it's customized.
export const DEFAULT_OFFER_AGREEMENT = `Terms of Offer

1. Contingent offer. This offer of employment is contingent upon the successful completion of a background verification, including (but not limited to) identity, education, and prior-employment checks. The company may withdraw this offer if the verification is unsatisfactory.

2. Accuracy of information. By accepting this offer you confirm that all information provided during the application process is true, complete, and accurate. Any misrepresentation may result in withdrawal of the offer or termination of employment.

3. Confidentiality. The contents of this offer, including compensation details, are confidential and must not be shared with any third party.

4. Documentation. You agree to provide the documents required for onboarding and verification (identity proof, education certificates, prior-employment/relieving letters) within the timelines communicated to you.

5. Formal offer letter. This page is a summary of the proposed terms. The complete terms and conditions of employment will be set out in the formal offer letter and employment agreement issued to you.

6. Acceptance. Clicking "Accept offer" indicates your agreement to the terms above and your intent to join on the proposed date of joining.`;

export async function getOfferAgreement(): Promise<string> {
  return (
    (await getSetting(SETTING_KEYS.offerAgreement)) || DEFAULT_OFFER_AGREEMENT
  );
}

// ---------------------------------------------------------------------------
// Outbound email configuration (Settings → Email, env vars as fallback)
// ---------------------------------------------------------------------------

export interface MailSettings {
  /** "auto" resolves from configured creds: smtp -> graph -> console. */
  provider: "auto" | "smtp" | "graph" | "console";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
  msTenantId: string;
  msClientId: string;
  msClientSecret: string;
  careersMailbox: string;
}

// Sign-in / security codes (login OTP, offer-page verification code) use a
// settings bundle that's completely independent from the one above, which
// covers candidate-facing recruiting mail (interview/rejection/approval).
// Kept separate so changing where recruiting mail goes (e.g. switching to
// Amazon SES) can never accidentally also change — or break — login email.
// Both fall back to the SAME env vars when their own DB rows are unset, so
// an existing single-provider deployment keeps working unchanged until the
// two are explicitly configured differently in Settings → Email.
export const OTP_SETTING_KEYS = {
  mailProvider: "otpMailProvider",
  smtpHost: "otpSmtpHost",
  smtpPort: "otpSmtpPort",
  smtpUser: "otpSmtpUser",
  smtpPass: "otpSmtpPass",
  mailFrom: "otpMailFrom",
  msTenantId: "otpMsTenantId",
  msClientId: "otpMsClientId",
  msClientSecret: "otpMsClientSecret",
  careersMailbox: "otpCareersMailbox",
} as const;

type MailSettingKeys = typeof SETTING_KEYS | typeof OTP_SETTING_KEYS;

async function loadMailSettings(keys: MailSettingKeys): Promise<MailSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          keys.mailProvider,
          keys.smtpHost,
          keys.smtpPort,
          keys.smtpUser,
          keys.smtpPass,
          keys.mailFrom,
          keys.msTenantId,
          keys.msClientId,
          keys.msClientSecret,
          keys.careersMailbox,
        ],
      },
    },
  });
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const pick = (key: string, env: string | undefined) => db[key] || env || "";

  const providerRaw = (
    db[keys.mailProvider] ||
    process.env.MAIL_PROVIDER ||
    "auto"
  ).toLowerCase();
  const provider = (
    ["auto", "smtp", "graph", "console"].includes(providerRaw)
      ? providerRaw
      : "auto"
  ) as MailSettings["provider"];

  const portRaw = pick(keys.smtpPort, process.env.SMTP_PORT);
  const smtpPort = Number(portRaw) || 465;

  return {
    provider,
    smtpHost: pick(keys.smtpHost, process.env.SMTP_HOST),
    smtpPort,
    smtpUser: pick(keys.smtpUser, process.env.SMTP_USER),
    smtpPass: pick(keys.smtpPass, process.env.SMTP_PASS),
    mailFrom: pick(keys.mailFrom, process.env.MAIL_FROM),
    msTenantId: pick(keys.msTenantId, process.env.MS_TENANT_ID),
    msClientId: pick(keys.msClientId, process.env.MS_CLIENT_ID),
    msClientSecret: pick(keys.msClientSecret, process.env.MS_CLIENT_SECRET),
    careersMailbox: pick(keys.careersMailbox, process.env.CAREERS_MAILBOX),
  };
}

/** Candidate-facing recruiting mail: interview invite, rejection, approval. */
export async function getMailSettings(): Promise<MailSettings> {
  return loadMailSettings(SETTING_KEYS);
}

/** Sign-in / security codes: login OTP, offer-page verification code. */
export async function getOtpMailSettings(): Promise<MailSettings> {
  return loadMailSettings(OTP_SETTING_KEYS);
}
