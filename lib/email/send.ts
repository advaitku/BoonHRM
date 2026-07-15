// OTP delivery. When no mail provider is configured (local dev), the code is
// printed to the server console instead — and captured for /api/dev/login.
import { mailConfigured, sendMail } from "@/lib/email/transport";

export { mailConfigured, mailProvider } from "@/lib/email/transport";

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
  if (!(await mailConfigured())) {
    console.log(
      `\n========================================\n[BoonHRM] OTP (${type}) for ${email}: ${otp}\n========================================\n`,
    );
    if (process.env.NODE_ENV !== "production") {
      // Captured by the dev-only auto-login endpoint (app/api/dev/login).
      (globalThis as Record<string, unknown>).__devLastOtp = { email, otp };
    }
    return;
  }

  const { otpEmail } = await import("@/lib/email/templates");
  const { subject, html } = await otpEmail(otp);
  await sendMail({ to: email, subject, html });
}
