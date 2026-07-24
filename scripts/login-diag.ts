// Diagnoses the login "Could not send code" 500 WITHOUT needing a build.
// Runs the exact Better Auth call the login page makes and prints the real
// error. Run from Plesk → Node.js → Run script → `login:diag`.
//
//   npm run login:diag
//
// Safe to delete once login works.
import "dotenv/config";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "";

  console.log("== ENV (as the script sees it via .env) ==");
  for (const k of [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "APP_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
    "NODE_ENV",
    "SEED_ADMIN_EMAIL",
  ]) {
    const v = process.env[k];
    const secret = k === "DATABASE_URL" || k.includes("SECRET") || k.includes("PASS");
    console.log(`  ${k}: ${v ? (secret ? `set(${v.length})` : v) : "MISSING"}`);
  }

  console.log("\n== DB ==");
  try {
    const { prisma } = await import("../lib/prisma");
    const t = Date.now();
    const users = await prisma.user.count();
    const admin = email
      ? await prisma.user.findUnique({ where: { email }, select: { role: true } })
      : null;
    console.log(
      `  OK in ${Date.now() - t}ms — users=${users}, adminExists=${Boolean(admin)}, role=${admin?.role ?? "-"}`,
    );
  } catch (e) {
    console.error("  DB FAILED:", e);
  }

  console.log("\n== Better Auth sendVerificationOTP (the exact login path) ==");
  try {
    const { auth } = await import("../lib/auth");
    const t = Date.now();
    const res = await auth.api.sendVerificationOTP({
      body: { email, type: "sign-in" },
    });
    console.log(`  OK in ${Date.now() - t}ms —`, res);
    console.log(
      "  → Send succeeded here. So the login code is fine and the browser 500 is\n" +
        "    an APP-ENVIRONMENT problem (the running app isn't getting the same env).",
    );
  } catch (e) {
    console.error(
      "  SEND-OTP FAILED — this is the real error behind 'Could not send code':\n",
      e,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
