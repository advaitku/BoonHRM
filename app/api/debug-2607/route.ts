// TEMPORARY diagnostic route — DELETE once login works.
// Reports what the RUNNING app actually sees (env presence, DB, mail, SMTP
// reachability) with timings, so we can tell what the login OTP path hangs on.
// Never returns secret VALUES — only presence/lengths. Gated by a URL token.
//
//   GET https://hrm.helloboon.com/api/_debug?key=boon-debug-2607
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKEN = "boon-debug-2607";

const mask = (v?: string) => (v ? `set(${v.length} chars)` : "MISSING");

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const out: Record<string, unknown> = {};

  // 1) What env the running app actually has (values redacted).
  out.env = {
    DATABASE_URL: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@")
      : "MISSING",
    BETTER_AUTH_SECRET: mask(process.env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "MISSING",
    APP_URL: process.env.APP_URL ?? "MISSING",
    SMTP_HOST: process.env.SMTP_HOST ?? "MISSING",
    SMTP_PORT: process.env.SMTP_PORT ?? "MISSING",
    SMTP_USER: process.env.SMTP_USER ?? "MISSING",
    SMTP_PASS: mask(process.env.SMTP_PASS),
    MAIL_FROM: process.env.MAIL_FROM ?? "MISSING",
    NODE_ENV: process.env.NODE_ENV ?? "MISSING",
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? "MISSING",
  };

  // 2) DB reachability + does the admin user exist?
  let t = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    const userCount = await prisma.user.count();
    const email = process.env.SEED_ADMIN_EMAIL;
    const admin = email
      ? await prisma.user.findUnique({ where: { email }, select: { role: true } })
      : null;
    out.db = {
      ok: true,
      ms: Date.now() - t,
      userCount,
      adminExists: Boolean(admin),
      adminRole: admin?.role ?? null,
    };
  } catch (e) {
    out.db = { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }

  // 3) Which mail provider the app resolves.
  t = Date.now();
  try {
    const { mailProvider } = await import("@/lib/email/transport");
    out.mail = { provider: await mailProvider(), ms: Date.now() - t };
  } catch (e) {
    out.mail = { error: e instanceof Error ? e.message : String(e), ms: Date.now() - t };
  }

  // 4) Can the app actually CONNECT to SMTP? (verify only — no send.)
  //    Short timeouts so a blocked port fails fast instead of hanging ~60s.
  t = Date.now();
  try {
    const nodemailer = (await import("nodemailer")).default;
    const port = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });
    await transporter.verify();
    out.smtpVerify = { ok: true, ms: Date.now() - t };
  } catch (e) {
    out.smtpVerify = { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(out, { status: 200 });
}
