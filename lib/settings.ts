import { prisma } from "@/lib/prisma";

// Admin-editable app settings, stored as key/value rows with env fallbacks.
export const SETTING_KEYS = {
  companyName: "companyName",
  autoRejectDays: "autoRejectDays",
  notificationEmail: "notificationEmail",
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

export async function getMailSettings(): Promise<MailSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          SETTING_KEYS.mailProvider,
          SETTING_KEYS.smtpHost,
          SETTING_KEYS.smtpPort,
          SETTING_KEYS.smtpUser,
          SETTING_KEYS.smtpPass,
          SETTING_KEYS.mailFrom,
          SETTING_KEYS.msTenantId,
          SETTING_KEYS.msClientId,
          SETTING_KEYS.msClientSecret,
          SETTING_KEYS.careersMailbox,
        ],
      },
    },
  });
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const pick = (key: string, env: string | undefined) => db[key] || env || "";

  const providerRaw = (
    db[SETTING_KEYS.mailProvider] ||
    process.env.MAIL_PROVIDER ||
    "auto"
  ).toLowerCase();
  const provider = (
    ["auto", "smtp", "graph", "console"].includes(providerRaw)
      ? providerRaw
      : "auto"
  ) as MailSettings["provider"];

  const portRaw = pick(SETTING_KEYS.smtpPort, process.env.SMTP_PORT);
  const smtpPort = Number(portRaw) || 465;

  return {
    provider,
    smtpHost: pick(SETTING_KEYS.smtpHost, process.env.SMTP_HOST),
    smtpPort,
    smtpUser: pick(SETTING_KEYS.smtpUser, process.env.SMTP_USER),
    smtpPass: pick(SETTING_KEYS.smtpPass, process.env.SMTP_PASS),
    mailFrom: pick(SETTING_KEYS.mailFrom, process.env.MAIL_FROM),
    msTenantId: pick(SETTING_KEYS.msTenantId, process.env.MS_TENANT_ID),
    msClientId: pick(SETTING_KEYS.msClientId, process.env.MS_CLIENT_ID),
    msClientSecret: pick(SETTING_KEYS.msClientSecret, process.env.MS_CLIENT_SECRET),
    careersMailbox: pick(SETTING_KEYS.careersMailbox, process.env.CAREERS_MAILBOX),
  };
}
