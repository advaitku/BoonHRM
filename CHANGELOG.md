# Changelog

All notable changes to BoonHRM are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); version is the `version`
field in `package.json`, shown in the app footer so a running deploy can be
identified at a glance.

## [Unreleased]

### Added
- **Boon Jobs landing page** at `/` — a public page listing all published open
  roles (each linking to its `/jobs/BOON-XXX` page), with a login button
  top-left, a "We're hiring" hero, and a brand footer (helloboon.com, phone,
  copyright). Shows a friendly empty state when nothing is published.

### Changed
- Visiting the bare domain no longer auto-redirects: signed-out visitors see
  the landing page (previously bounced to `/login`), and signed-in users see
  it too with the top-left button reading **Dashboard** instead of Log in
  (previously bounced straight to `/dashboard`).

## [0.5.0] - 2026-08-01

### Added
- Every job opening now has a human-readable reference code (`BOON-001`,
  `BOON-002`, …) — sequential, stable, shown on the list (card + table views),
  the opening page, and the edit page. Existing openings were backfilled in
  creation order.
- Job descriptions are now rich text: a WYSIWYG editor (bold/italic, headings,
  lists, quotes, links) replaces the plain textarea, and the description is now
  actually displayed on the opening's page (previously it was stored but shown
  nowhere). Existing plain-text descriptions were converted automatically.
- Public job pages: flipping the new **Publish** switch on an opening makes it
  viewable by anyone at `/jobs/BOON-001` — a branded, shareable page with the
  role details, description, posting date and an email apply button (pre-tagged
  with the reference code). Off by default, so confidential roles stay private;
  unpublished roles are indistinguishable from nonexistent ones (no info leak).
  Closed-but-published roles show "no longer accepting applications" instead of
  breaking the link. A `/jobs` careers index is planned for a later version.
- All rendered description HTML is sanitized against a strict allowlist on both
  save and render (new `sanitize-html` dependency) — scripts, event handlers,
  `javascript:` URLs, images and iframes are stripped.

## [0.4.0] - 2026-07-30

### Added
- Job openings can now be assigned to a team member. A small initials badge
  (e.g. "AB" for Ann Ban) shows who's on it on the job-openings list, and an
  assignee picker is available on the opening's own page.
- Filter and sort controls on the job-openings list (status, assignee,
  newest/oldest/title/most candidates), plus a card/table view toggle.
- Candidates inside a job opening can now be viewed as a table (name, stage,
  contact, tags, time in stage) as an alternative to the Kanban board, via a
  view toggle.
- Job openings can have a **position closure deadline** (shown on the list and
  the opening page, flagged red once it passes) and an **interview
  deadline** — when set, it's appended as a line in the interview invite
  email ("Please complete this interview by …").
- New **Support email** setting (Settings → General). Every outbound email
  now ends with an auto-generated-email disclaimer ("please do not reply —
  for support, contact …"). The interview/approval templates' default
  "reply to this email" wording was replaced with a reference to that
  support contact instead, so the two aren't contradictory (not every mail
  provider — e.g. Amazon SES — routes replies to a monitored inbox).

## [0.3.0] - 2026-07-30

### Fixed
- Recruiting emails (OTP, interview invite, rejection, approval, offer link)
  were landing in spam. Every send now includes a plain-text alternative
  alongside the HTML — HTML-only mail is penalized by Gmail/Outlook/O365 spam
  filters. Also dropped the leading numeric code from the offer-verification
  subject line (`"123456 is your..."` reads as a phishing pattern to mail
  filters); it now matches the login OTP's non-code-leading subject style.
- Deliverability also depends on domain authentication (SPF/DKIM/DMARC for
  the sending domain) and sender reputation, which are DNS/mailbox-provider
  settings outside the app — see `docs/GMAIL-SETUP.md`.

### Added
- Sign-in codes (login OTP, offer verification) and recruiting mail
  (interview/rejection/approval) are now two independent mail channels,
  each with its own Settings → Email tab and SMTP/Graph config. Changing
  where recruiting mail goes (e.g. switching to Amazon SES) can no longer
  accidentally affect login. A channel with no explicit settings falls back
  to the same env vars as before, so existing single-provider deployments
  are unaffected.
- The generic SMTP sender already supports any SMTP provider, including
  Amazon SES — documented in `docs/GMAIL-SETUP.md` alongside Gmail/Workspace.

## [0.2.0] - 2026-07-27

### Fixed
- Production OTP login 500: `DATABASE_URL` was missing from the Plesk Node.js
  environment, and MySQL's `bind-address` was publicly exposed on `:3306`
  (now bound to `127.0.0.1`).
- "Enter manually" candidate form crashed with "Invalid input: expected
  string, received null" — omitted optional fields came through as `null`,
  which `z.string().optional()` rejects (only `undefined` is optional).

### Added
- Version number shown in the app footer (`package.json` → `version`).
- Candidates can now have multiple resumes (new `Resume` model, one row per
  upload) instead of a single resume slot that got overwritten on replace.
- The "Enter manually" candidate form now collects address, work history and
  education up front instead of deferring them to the candidate's page.

### Docs
- Rewrote `docs/DEPLOY-PLESK.md` as a full step-by-step Plesk install guide.
- Added a Quick Install section to `README.md` and fixed a stale roadmap entry.

## [0.1.0] - 2026-07-14

Initial V1 build: OTP-only login, job openings CRUD, candidate
add-by-form/resume-upload, Kanban (Pool → Interview → Shortlist,
Rejected/Approved), stage-triggered emails, 75-day auto-reject cron, Plesk
deploy.
