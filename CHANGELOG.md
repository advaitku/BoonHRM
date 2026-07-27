# Changelog

All notable changes to BoonHRM are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); version is the `version`
field in `package.json`, shown in the app footer so a running deploy can be
identified at a glance.

## [Unreleased]

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
