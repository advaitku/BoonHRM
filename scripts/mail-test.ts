// Diagnostic: attempts to send a test email on BOTH independent mail channels
// (recruiting + sign-in codes — see lib/settings.ts) and prints the real error
// (which the login page hides behind a generic "Could not send code" 500).
// Run it from Plesk → Node.js → Run script → `mail:test`, and read the output
// in the panel.
//
//   npm run mail:test        # sends to SEED_ADMIN_EMAIL on both channels
//
// Safe to delete once outbound email is confirmed working.
import "dotenv/config";
import { sendMail, sendOtpMail, mailProvider, otpMailProvider } from "../lib/email/transport";

async function testChannel(
  label: string,
  to: string,
  getProvider: () => Promise<string>,
  send: typeof sendMail,
) {
  const provider = await getProvider();
  console.log(`\n[${label}] Resolved mail provider: ${provider}`);
  if (provider === "console") {
    console.log(
      `→ [${label}] Mail is NOT configured (console mode). Set SMTP_* (or MS_*) in .env, ` +
        `or the channel's own settings in Settings → Email, then Restart App.`,
    );
    return;
  }

  console.log(`[${label}] Attempting to send a test email to ${to} via ${provider} ...`);
  const result = await send({
    to,
    subject: `BoonHRM SMTP test (${label})`,
    html: "<p>If you received this, outbound email works. 🎉</p>",
    text: "If you received this, outbound email works.",
  });
  console.log(`[${label}] SUCCESS — outbound email works. Result:`, result);
}

async function main() {
  const to = process.env.SEED_ADMIN_EMAIL;
  if (!to) {
    console.log("SEED_ADMIN_EMAIL is not set in .env — set it (that's the recipient).");
    return;
  }

  await testChannel("sign-in codes", to, otpMailProvider, sendOtpMail);
  await testChannel("recruiting", to, mailProvider, sendMail);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nMAIL SEND FAILED — this is the real error behind 'Could not send code':\n");
    console.error(e);
    process.exit(1);
  });
