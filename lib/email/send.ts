// Central email sender. In dev (no Graph credentials) everything prints to the
// server console so login + notifications work without Microsoft 365.
// M6 fleshes out the Microsoft Graph draft+send path and EmailMessage logging.

export function graphConfigured(): boolean {
  return Boolean(
    process.env.MS_TENANT_ID &&
      process.env.MS_CLIENT_ID &&
      process.env.MS_CLIENT_SECRET &&
      process.env.CAREERS_MAILBOX,
  );
}

type OtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

export async function sendOtpEmail({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: OtpType;
}): Promise<void> {
  if (!graphConfigured()) {
    console.log(
      `\n========================================\n[BoonHRM] OTP (${type}) for ${email}: ${otp}\n========================================\n`,
    );
    if (process.env.NODE_ENV !== "production") {
      // Captured by the dev-only auto-login endpoint (app/api/dev/login).
      (globalThis as Record<string, unknown>).__devLastOtp = { email, otp };
    }
    return;
  }
  const [{ sendGraphMail }, { otpEmail }] = await Promise.all([
    import("@/lib/email/graph-send"),
    import("@/lib/email/templates"),
  ]);
  const { subject, html } = otpEmail(otp);
  await sendGraphMail({ to: email, subject, html });
}
