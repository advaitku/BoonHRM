# BoonHRM

Internal applicant tracking system: job openings with a drag-and-drop candidate
pipeline (Pool → Interview → Shortlist, plus Approved/Rejected buckets),
automatic candidate emails through the company's Microsoft 365 mailbox, resume
uploads with text extraction, and OTP-only sign-in for the HR team.

## Features

- **Passwordless login** — 6-digit email codes (Better Auth), `admin` & `hr` roles, admin-managed users, no self-signup.
- **Job openings** — location, number of positions, open/closed status, online & in-person interview URLs, per-opening auto-notify toggle.
- **Candidates** — add by form or by resume upload (PDF/DOCX text extraction fills email/phone automatically); each candidate has a profile, viewable/replaceable resume, stage history and email log.
- **Kanban board** — drag candidates between stages; moving to Interview asks which URL to send, rejecting asks who ended the process (and emails politely).
- **Offers** — approving a candidate captures CTC and date of joining, then emails a secure OTP-gated offer link where the candidate can accept or decline; unanswered offers expire automatically after 2 days.
- **75-day auto-reject** — a daily job rejects candidates stuck in the pipeline and notifies them (per-opening opt-out).
- **Tags & comments** — tag candidates for quick filtering and leave threaded discussion notes on a candidate's page.
- **Dashboard** — live metrics, current-openings overview, global candidate search.
- **Settings** — admin-only: company info, email templates, and outbound email provider (Gmail or Microsoft 365), all editable from the UI with no server restart.

## Stack

Next.js 15 (App Router, TS) · Prisma 7 + MariaDB/MySQL · Better Auth ·
shadcn/ui + Tailwind v4 · dnd-kit · pluggable email (Gmail SMTP or Microsoft Graph).

## Local development

```bash
npm install
copy .env.example .env        # then fill in values (defaults work for dev)
powershell scripts/start-db.ps1   # portable MariaDB on :3307 (Windows dev box)
npx prisma migrate dev
npx tsx prisma/seed.ts        # first admin (SEED_ADMIN_EMAIL)
npx tsx scripts/seed-demo.ts  # optional demo data
npm run dev
```

Sign in at `http://localhost:3000/login` — in dev, OTP codes print to the
server console, or just click **⚡ Dev sign-in as admin** (dev builds only).
Emails aren't actually sent until the `MS_*` env vars are configured; they're
logged to the console and recorded in the app either way.

## Installing on Plesk (production)

Runs on a single AWS Lightsail instance under Plesk (Passenger). Full
step-by-step instructions, in order, from a blank Plesk server to a working
install:

**→ [`docs/DEPLOY-PLESK.md`](docs/DEPLOY-PLESK.md) — start here.**

The short version: create a database + a private storage folder, point Plesk's
Node.js app at this repo with `server.js` as the startup file, set a handful of
env vars, build, seed the first admin, and add two daily Scheduled Tasks.
Email (Gmail or Microsoft 365) can be wired up from the app's own
**Settings → Email** page after your first login — see the guide for both
options:

- [`docs/GMAIL-SETUP.md`](docs/GMAIL-SETUP.md) — Gmail App Password (fastest).
- [`docs/M365-SETUP.md`](docs/M365-SETUP.md) — Microsoft 365 Graph (needed for V2 reply-threading).

## Roadmap (V2)

- Candidate replies threaded into the app (Graph delta polling; outbound
  `conversationId` is already stored) + dashboard inbox; closed candidates stop
  accepting replies.
- Rule-based resume parsing already fills name/address/work history/education
  when the resume's layout allows it (see `lib/resume.ts`); an AI-based parser
  remains a possible upgrade for harder layouts (scanned PDFs, two-column CVs).
- Document upload + HR verification during onboarding (post-offer-acceptance).
