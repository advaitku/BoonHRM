// Diagnostic: attempts to send a test email using the SAME transport the login
// OTP uses, and prints the real error (which the login page hides behind a
// generic "Could not send code" 500). Run it from Plesk → Node.js → Run script
// → `mail:test`, and read the output in the panel.
//
//   npm run mail:test        # sends to SEED_ADMIN_EMAIL
//
// Safe to delete once outbound email is confirmed working.
import "dotenv/config";
import { sendMail, mailProvider } from "../lib/email/transport";

async function main() {
  const to = process.env.SEED_ADMIN_EMAIL;

  const provider = await mailProvider();
  console.log(`\nResolved mail provider: ${provider}`);
  if (provider === "console") {
    console.log(
      "→ Mail is NOT configured (console mode). Set SMTP_* (or MS_*) in .env, then Restart App.\n" +
        "  In console mode the login OTP is only printed to the server console, not emailed.",
    );
    return;
  }
  if (!to) {
    console.log("SEED_ADMIN_EMAIL is not set in .env — set it (that's the recipient).");
    return;
  }

  console.log(`Attempting to send a test email to ${to} via ${provider} ...`);
  const result = await sendMail({
    to,
    subject: "BoonHRM SMTP test",
    html: "<p>If you received this, outbound email works. 🎉</p>",
  });
  console.log("\nSUCCESS — outbound email works. Result:", result);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nMAIL SEND FAILED — this is the real error behind 'Could not send code':\n");
    console.error(e);
    process.exit(1);
  });
