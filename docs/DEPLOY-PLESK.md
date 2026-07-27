# Installing BoonHRM on Plesk (AWS Lightsail)

A complete, follow-in-order guide to get BoonHRM running on a Plesk server.
Budget about 45–60 minutes for a first install. After that, redeploys are a
one-command affair (see [Updating](#updating-later-deploys) at the bottom).

## What you need before starting

- [ ] A Plesk (Obsidian or newer) server — e.g. an AWS Lightsail instance with
      the Plesk image — with the **Node.js** extension available (Plesk runs
      Node apps through Phusion Passenger; most Lightsail Plesk images already
      have this). Check under **Extensions** → search "Node.js" if unsure.
- [ ] A domain or subdomain you can point at the server (e.g. `hrm.yourcompany.com`).
- [ ] Nothing else. MySQL/MariaDB ships with Plesk, and **email setup is not
      required to complete this install** — you can configure it from inside
      the app after your first login (Step 9).

---

## Step 1 — Create the domain in Plesk

Plesk → **Websites & Domains** → **Add Domain**, enter your domain/subdomain,
point its DNS `A` record at the server's IP. Standard Plesk domain setup —
skip this if the domain already exists.

## Step 2 — Create the database

Plesk → your domain → **Databases** → **Add Database**:

- Database name: `boonhrm`
- Charset: `utf8mb4`
- Create a **new database user** with full rights on this database only.

Write down the host (usually `localhost`), port (`3306`), username, and
password — you'll need them in Step 5 as:

```
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/boonhrm
```

## Step 3 — Create the private storage directory

Candidate resumes must live **outside** the public web root. Via Plesk's
**File Manager** or SSH, create a directory as the domain's system user:

```bash
mkdir -p ~/private_storage/boonhrm
chmod 700 ~/private_storage/boonhrm
```

Note its **absolute path** (Plesk shows this in the File Manager breadcrumb,
typically `/var/www/vhosts/yourdomain.com/private_storage/boonhrm`) — you'll
need it in Step 5 as `PRIVATE_STORAGE_DIR`.

## Step 4 — Get the code onto the server

**Option A — Plesk Git extension (recommended):** Plesk → your domain → **Git**
→ add this repository (Plesk can pull directly from GitHub, or you can push to
Plesk's own remote). Set the deployment path to a directory **next to**
`httpdocs`, e.g. `/boonhrm` — do **not** deploy into `httpdocs` itself; Node
apps are served by Passenger, not from the static web root.

**Option B — manual upload** (no Git access from the server): locally, zip the
repo excluding `node_modules`, `.next`, and `.env` (`git archive` is the clean
way: `git archive -o boonhrm.zip HEAD`), then upload and extract it via
Plesk's File Manager into that same sibling directory.

## Step 5 — Configure the Node.js app in Plesk

Plesk → your domain → **Node.js**:

| Setting | Value |
|---|---|
| Node.js version | 22 LTS (or the newest LTS Plesk offers) |
| Document root | `/<app-folder>/public` |
| Application mode | `production` |
| Application root | the folder from Step 4 |
| **Application startup file** | `server.js` — **not** `npm start` (see note below) |

> `server.js` in this repo is a small custom entry point that boots Next.js
> directly on Passenger's assigned port. `npm run start` also works if you
> ever run the app outside Passenger, but Plesk's startup-file field should
> point at `server.js` directly.

Click **Enable Node.js**, then set the **environment variables** on the same
page. Only the block below is required to get the app running and logged
into — everything email-related is optional here (see the note after):

```
DATABASE_URL        = mysql://USER:PASSWORD@localhost:3306/boonhrm
BETTER_AUTH_SECRET  = <run: openssl rand -base64 32>
BETTER_AUTH_URL     = https://hrm.yourcompany.com
APP_URL             = https://hrm.yourcompany.com
COMPANY_NAME        = Your Company
PRIVATE_STORAGE_DIR = /var/www/vhosts/yourcompany.com/private_storage/boonhrm
SEED_ADMIN_EMAIL    = you@yourcompany.com
SEED_ADMIN_NAME     = Your Name
NODE_ENV            = production
```

**About email:** BoonHRM needs *some* way to send the OTP login code and
candidate emails, but you do **not** have to set that up here. You have two
options, and either is fine:

- **Set it up now** — add the `SMTP_*` (Gmail) or `MS_*` (Microsoft 365)
  variables from [`GMAIL-SETUP.md`](./GMAIL-SETUP.md) or
  [`M365-SETUP.md`](./M365-SETUP.md) to this same env var list.
- **Skip it for now** — leave email unconfigured and finish setup via the
  in-app **Settings → Email** page after your first login (Step 8–9 below
  walk through exactly how). This is usually the easier path since it needs
  no server restart and lets you paste credentials straight into a form with
  a "send test email" button.

## Step 6 — HTTPS

Plesk → **SSL/TLS Certificates** → issue a **Let's Encrypt** certificate for
the domain, and enable "Redirect from HTTP to HTTPS". This is **not
optional** — login codes and candidate PII travel over this connection.

## Step 7 — First build, migrate, and seed

SSH into the server (or use Plesk's built-in SSH terminal), `cd` into the app
folder from Step 4, then run:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
touch tmp/restart.txt   # tells Passenger to restart the app
```

Then, **once only**, seed the first admin account (reads `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_NAME` from the env vars you set in Step 5):

```bash
npx tsx prisma/seed.ts
```

You should see `Seeded first admin: you@yourcompany.com`.

## Step 8 — Log in for the first time

Open `https://hrm.yourcompany.com` — you should land on `/login`. Enter the
`SEED_ADMIN_EMAIL` address and request a code.

- **If you configured email in Step 5**, the code arrives in that inbox —
  enter it and you're in.
- **If you skipped email setup**, the code isn't emailed anywhere — it's
  printed to the app's log instead. View it via Plesk → your domain →
  **Node.js** → **Show Log** (or over SSH: `tail -f ~/logs/<domain>/nodejs_app.log`,
  the exact path is shown at the top of the Node.js panel). Look for:

  ```
  [BoonHRM] OTP (sign-in) for you@yourcompany.com: 123456
  ```

  Enter that 6-digit code at `/login`. This is a normal, intentional fallback
  in the app — not a workaround — so there's no risk in using it to get your
  first login done before email is configured.

## Step 9 — Configure email (if you skipped it in Step 5)

Once logged in as admin: **Settings → Email**.

1. Pick a provider — **Gmail / SMTP** is the quicker path (see
   [`GMAIL-SETUP.md`](./GMAIL-SETUP.md) for the 2-minute App Password steps);
   **Microsoft 365** is the fuller option (see [`M365-SETUP.md`](./M365-SETUP.md),
   needs an Azure app registration).
2. Fill in the fields for your chosen provider and **Save**.
3. Click **Send test email to me** — it should arrive within a few seconds at
   your own admin address. If it doesn't, the error message tells you what's
   wrong (bad credentials, missing field, etc.).

Settings saved here are stored in the database and **override** the env vars
from Step 5 — no restart needed, and you can switch providers later the same
way (e.g. move from Gmail to Microsoft 365 once IT sets up the Azure app).

## Step 10 — Scheduled Tasks (2 daily cron jobs)

BoonHRM has two background sweeps that must run daily. Plesk → your domain →
**Scheduled Tasks** → **Add Task**, once for each:

| Task | Command | Schedule |
|---|---|---|
| Auto-reject stale candidates | `/opt/plesk/node/22/bin/node /var/www/vhosts/yourcompany.com/<app>/node_modules/.bin/tsx /var/www/vhosts/yourcompany.com/<app>/scripts/auto-reject-stale.ts` | Daily, e.g. 03:00 |
| Expire unanswered offer links | `/opt/plesk/node/22/bin/node /var/www/vhosts/yourcompany.com/<app>/node_modules/.bin/tsx /var/www/vhosts/yourcompany.com/<app>/scripts/expire-offers.ts` | Daily, e.g. 03:05 |

Adjust the Node version number in the path to match Step 5. Plesk runs
scheduled tasks in a chrooted shell, so:

- Use **absolute paths** for both the `node` binary and the script — relative
  paths will fail silently.
- Confirm the task's environment can see `DATABASE_URL` — if your Plesk setup
  doesn't inherit the app's env vars for scheduled tasks, prefix the command
  with the var directly: `DATABASE_URL=mysql://... /opt/plesk/node/22/bin/node ...`.

After adding each task, click **Run Now** once and check the output — it
should end with `[auto-reject] Done` / a similar success line, not a stack
trace.

## Step 11 — Final smoke test

Work through this checklist on the live site:

- [ ] `https://hrm.yourcompany.com` loads and redirects to `/login`
- [ ] Requesting and entering an OTP logs you in
- [ ] **Settings → Email → Send test email to me** succeeds
- [ ] Create a job opening
- [ ] Add a candidate — try both **Enter manually** and **Upload resume**
- [ ] Drag a candidate to **Interview** → invite email arrives with the URL you picked
- [ ] Drag a candidate to **Rejected** → reason modal appears, rejection email sends
- [ ] Drag a candidate to **Approved** → fill CTC/date of joining → offer email arrives with a working link to `/offer/<token>`
- [ ] Both Scheduled Tasks from Step 10 show a successful last run

If every box is checked, the install is complete.

---

## Updating (later deploys)

Once installed, shipping a new version is just:

```bash
git pull                     # or Plesk Git → "Pull updates"
npm ci
npx prisma generate
npx prisma migrate deploy    # safe to re-run — only applies new migrations
npm run build
touch tmp/restart.txt
```

Before deploying, bump the `version` field in `package.json` (semver: patch
for fixes, minor for features, major for breaking changes) and add an entry
to `CHANGELOG.md`. The version is shown in the app's footer, so after
restarting you can confirm the live site is actually running the build you
just shipped.

## Troubleshooting

- **502/503 from Passenger** — Plesk → Node.js → **Show Log**. Most common
  cause: a missing env var (the app throws at boot) or forgetting to re-run
  `npm ci` / `npm run build` after pulling new code.
- **Emails not sending** — check **Settings → Email**: the badge next to
  "Currently active" shows which provider is actually resolved. For Gmail:
  wrong App Password or 2FA not enabled on the Google account. For Microsoft
  365: `MS_*` values wrong, admin consent not granted, or the RBAC scope
  doesn't cover the mailbox (see `M365-SETUP.md` §2).
- **OTP not arriving anywhere** — no provider is configured yet; check the
  Node.js log per Step 8 for the printed code, then finish Step 9.
- **A cron task's output looks empty or errors on `DATABASE_URL`** — the
  scheduled task's shell isn't inheriting the app's env vars; set them
  inline on the command as shown in Step 10.
- **Passenger doesn't pick up a new deploy** — `touch tmp/restart.txt` in the
  app root, or use the Node.js panel's **Restart App** button.
- **Passenger struggles with Next.js specifically** — as a fallback, run
  `npm run build && npm run start` under PM2 instead, and point Plesk's
  Apache/nginx reverse proxy at `127.0.0.1:3000`. No code changes are needed —
  `server.js` already honors the `PORT` env var either way.
