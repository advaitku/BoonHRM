# BoonHRM — Applicant Tracking System

Internal recruiting tool. HR posts job openings, tracks candidates on a Kanban
board (Pool → Interview → Shortlist, with Rejected/Approved buckets), and the
system sends recruiting emails (OTP login, interview invites, rejections,
approvals) via the company's Microsoft 365 mailbox. Deploys to a single AWS
Lightsail instance managed with Plesk. See `docs/PLAN.md`-equivalent at
`~/.claude/plans/i-want-to-make-elegant-kahan.md` for the full spec.

## Stack

- **Next.js 15** (App Router, TypeScript, Turbopack) — persistent Node server (not serverless).
- **Prisma 7** with the **`@prisma/adapter-mariadb`** driver adapter (no Rust engine). Generated client lives in `lib/generated/prisma/` (git-ignored). Import the shared instance from `@/lib/prisma`.
- **MySQL/MariaDB** — Plesk-provisioned in prod; portable MariaDB locally (see below).
- **Better Auth** (`better-auth`) — **OTP-only login** (`emailOTP` plugin), `admin` plugin for `admin`/`hr` roles. No passwords, no public signup. Auth tables (`user`/`session`/`account`/`verification`) are **hand-maintained** in `prisma/schema.prisma` — do NOT run `better-auth generate` (it would rewrite them).
- **shadcn/ui only** (Radix + Tailwind v4), components in `components/ui/` (style: `radix-nova`). Add more with `npx shadcn@latest add -y <name>`.
- **dnd-kit** for the Kanban drag-and-drop.
- **Outbound email** is pluggable (`lib/email/transport.ts`): **Gmail/SMTP** via nodemailer (interim, `SMTP_*` env — docs/GMAIL-SETUP.md), **Microsoft Graph** app-only (`MS_*` env — docs/M365-SETUP.md, needed for V2 reply-threading), or **console** in dev (no creds: OTP + emails print to the console). Auto-detected, or forced with `MAIL_PROVIDER`.
- **Resume**: `unpdf` (PDF) / `mammoth` (DOCX) text extraction + regex for email/phone only (V1).

## Commands

```bash
npm run dev        # local dev server (http://localhost:3000)
npm run build      # production build (standalone on Linux; plain on Windows)
npm run lint       # eslint
npx tsc --noEmit   # typecheck without touching .next (safe while dev server runs)
npx prisma migrate dev --name <x>   # create + apply a migration (local)
npx prisma migrate deploy           # apply migrations (prod)
npx prisma generate                 # regenerate client after schema edits
npx prisma studio                   # browse the DB
npx tsx prisma/seed.ts              # seed the first admin
npx tsx scripts/seed-demo.ts        # optional demo opening + candidates
npx tsx scripts/auto-reject-stale.ts   # 75-day sweep (runs daily via cron in prod)
npx tsx scripts/expire-offers.ts       # expire unanswered 2-day offer links → back to Shortlist (daily cron)
```

**Warning**: `npm run build` and `npm run dev` share `.next` by default —
running a build while the dev server is up corrupts the dev cache (500s /
ENOENT app-build-manifest). For local verification builds ALWAYS use a separate
dist dir so the dev server is untouched:
`NEXT_DIST_DIR=.next-build npm run build` (bash) or
`$env:NEXT_DIST_DIR='.next-build'; npm run build` (PowerShell).
If the dev server ever 500s with ENOENT under `.next/`, stop it, `rm -rf .next`,
and start it again.

**Dev auth bypass**: the login page has a "⚡ Dev sign-in as admin" button, and
`POST /api/dev/login` (optionally `{"email": "<existing user>"}`) creates a real
session without reading OTP codes. Both are 404/hidden in production builds.
Scripts must NOT import `server-only`-guarded modules; that import was removed
from `lib/` files shared with `scripts/` (only `lib/auth-helpers.ts` keeps it).

## Local database (portable MariaDB, no admin needed)

Docker can't run on this machine (BIOS virtualization off) and MSI installs need
admin, so local dev uses a **portable MariaDB** unpacked at
`C:\Users\Advait\mariadb-portable\` with its data dir at
`C:\Users\Advait\mariadb-data\`, listening on **port 3307**.

Start it (it does not auto-start on boot):

```powershell
& "C:\Users\Advait\mariadb-portable\mariadb-12.3.2-winx64\bin\mariadbd.exe" `
  --no-defaults --datadir="C:\Users\Advait\mariadb-data" --port=3307 --bind-address=127.0.0.1 --console
```

DB `boonhrm`, user `boon` / `bo0nhrm_dev` (see `.env` `DATABASE_URL`). Client:
`...\bin\mariadb.exe -u boon -p"bo0nhrm_dev" --port=3307 boonhrm`.

## Conventions

- **Mutations** → **Server Actions** (session-carrying: stage moves, sending email, CRUD, user mgmt). **Route handlers** only for public multipart upload, authenticated file streaming, and Better Auth.
- **Path alias** `@/*` → repo root. Inside `lib/prisma.ts`, the generated client is imported by **relative** path (`./generated/prisma/client`) so `tsx` scripts resolve it without alias config.
- **UI**: shadcn components only. No other component libraries. Icons from `lucide-react`.
- **Route groups**: `(auth)` (login), `(app)` (authenticated shell), `(public)` (token-gated pages, no session).
- **Roles** are the string `role` on the Better Auth `user` row: `"admin"` | `"hr"`.

## Env

Copy `.env.example` → `.env`. Key vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`APP_URL`, `MS_TENANT_ID`/`MS_CLIENT_ID`/`MS_CLIENT_SECRET`/`CAREERS_MAILBOX`
(Graph — blank in dev), `PRIVATE_STORAGE_DIR`, `SEED_ADMIN_EMAIL`. Graph setup
steps are in `docs/M365-SETUP.md`.

## Scope

**V1**: OTP auth + user mgmt, dashboard (opening cards + global candidate search),
job openings CRUD, candidates (form/resume upload + basic extraction), Kanban,
stage-triggered emails (interview/rejection/approval), 75-day auto-reject cron,
Plesk deploy.

**V2 (deferred)**: inbound email reply-threading into a single chain + dashboard
inbox; AI resume parsing (name/address/jobs/education); document upload +
verification for approved candidates. The `EmailMessage.conversationId` is
already stored in V1 so V2 threading is a clean add.
