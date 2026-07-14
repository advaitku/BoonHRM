# BoonHRM

Internal applicant tracking system: job openings with a drag-and-drop candidate
pipeline (Pool → Interview → Shortlist, plus Approved/Rejected buckets),
automatic candidate emails through the company's Microsoft 365 mailbox, resume
uploads with text extraction, and OTP-only sign-in for the HR team.

## Features

- **Passwordless login** — 6-digit email codes (Better Auth), `admin` & `hr` roles, admin-managed users, no self-signup.
- **Job openings** — location, number of positions, open/closed status, online & in-person interview URLs, per-opening auto-notify toggle.
- **Candidates** — add by form or by resume upload (PDF/DOCX text extraction fills email/phone automatically); each candidate has a profile, viewable/replaceable resume, stage history and email log.
- **Kanban board** — drag candidates between stages; moving to Interview asks which URL to send, rejecting asks who ended the process (and emails politely), approving captures salary/CTC and congratulates.
- **75-day auto-reject** — a daily job rejects candidates stuck in the pipeline and notifies them (per-opening opt-out).
- **Dashboard** — live metrics, current-openings overview, global candidate search.

## Stack

Next.js 15 (App Router, TS) · Prisma 7 + MariaDB/MySQL · Better Auth ·
shadcn/ui + Tailwind v4 · dnd-kit · Microsoft Graph (app-only) for email.

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

## Deployment

Runs on a single AWS Lightsail instance under Plesk (Passenger). See:

- [`docs/DEPLOY-PLESK.md`](docs/DEPLOY-PLESK.md) — full server runbook.
- [`docs/M365-SETUP.md`](docs/M365-SETUP.md) — Azure app registration +
  mailbox scoping (required for production email/OTP).

## Roadmap (V2)

- Candidate replies threaded into the app (Graph delta polling; outbound
  `conversationId` is already stored) + dashboard inbox; closed candidates stop
  accepting replies.
- AI resume parsing (name/address/work history/education auto-fill).
- Post-approval document upload with tokenized no-login links + HR verification.
