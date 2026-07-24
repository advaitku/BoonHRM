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

  // 5) Who/where is this process? (compare against Run-script context)
  try {
    const os = await import("node:os");
    out.proc = {
      user: os.userInfo().username,
      cwd: process.cwd(),
      node: process.version,
      pid: process.pid,
    };
  } catch (e) {
    out.proc = { error: e instanceof Error ? e.message : String(e) };
  }

  // 6) Raw TCP to the DB port — does MariaDB even answer this process?
  t = Date.now();
  out.rawTcp = await new Promise((resolve) => {
    import("node:net").then(({ createConnection }) => {
      const started = Date.now();
      const sock = createConnection({ host: "127.0.0.1", port: 3306 });
      const done = (r: Record<string, unknown>) => {
        sock.destroy();
        resolve({ ...r, ms: Date.now() - started });
      };
      sock.setTimeout(4000, () => done({ ok: false, error: "TCP connect timeout (4s)" }));
      sock.once("error", (e) => done({ ok: false, error: e.message }));
      // MariaDB sends a greeting packet immediately on connect.
      sock.once("data", (buf) =>
        done({ ok: true, greeting: buf.length + " bytes received (server answered)" }),
      );
      sock.once("connect", () => {
        // connected but no greeting within 4s → setTimeout above fires
      });
    });
  });

  // 7) Direct single mariadb connection (no pool) — surfaces the REAL error
  //    that the pool's "pool timeout" message hides.
  t = Date.now();
  try {
    const mariadb = (await import("mariadb")).default;
    const u = new URL(process.env.DATABASE_URL ?? "");
    const conn = await mariadb.createConnection({
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      connectTimeout: 5000,
    });
    const rows = await conn.query("SELECT 1 AS ok");
    await conn.end();
    out.directDb = { ok: true, ms: Date.now() - t, rows };
  } catch (e) {
    const err = e as Error & { code?: string; errno?: number; sqlState?: string };
    out.directDb = {
      ok: false,
      ms: Date.now() - t,
      error: err.message,
      code: err.code ?? null,
      errno: err.errno ?? null,
      sqlState: err.sqlState ?? null,
    };
  }

  // 8) Compare process.env.DATABASE_URL against what's in the env files on
  //    disk. Fingerprints only (length + hash prefix) — never the value.
  try {
    const { createHash } = await import("node:crypto");
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const fp = (s: string | null | undefined) =>
      s
        ? { len: s.length, sha8: createHash("sha256").update(s).digest("hex").slice(0, 8) }
        : null;
    const files: Record<string, unknown> = {};
    for (const f of [".env", ".env.local", ".env.production", ".env.production.local"]) {
      try {
        const txt = readFileSync(join(process.cwd(), f), "utf8");
        const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/m);
        let raw = m ? m[1].trim() : null;
        if (raw && (raw.startsWith('"') || raw.startsWith("'"))) raw = raw.slice(1, -1);
        files[f] = { exists: true, dbUrl: fp(raw) };
      } catch {
        files[f] = { exists: false };
      }
    }
    out.envCompare = {
      processDbUrl: fp(process.env.DATABASE_URL),
      files,
      note: "processDbUrl.sha8 should equal .env's dbUrl.sha8 — a mismatch means something overrides .env",
    };
  } catch (e) {
    out.envCompare = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(out, { status: 200 });
}
