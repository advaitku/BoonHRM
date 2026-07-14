# Deploying BoonHRM to Plesk (AWS Lightsail)

One-time setup, then every deploy is `git push` + one click (or fully automatic).

## Prerequisites

- Plesk Obsidian on the Lightsail instance with the **Node.js** extension installed
  (Plesk runs Node apps via Phusion Passenger).
- A domain/subdomain in Plesk (e.g. `hrm.yourcompany.com`) with DNS pointing at
  the instance.
- MySQL/MariaDB available in Plesk (bundled by default).
- The Microsoft 365 setup from [`M365-SETUP.md`](./M365-SETUP.md) — without it,
  OTP login emails cannot be sent in production.

## 1. Database

In Plesk → **Databases** → Add database:

- Name: `boonhrm`, charset `utf8mb4`.
- Create a dedicated DB user with full rights **on this database only**.
- Note host (usually `localhost`), port (3306), user, password →
  `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/boonhrm`

## 2. Private storage directory

SSH in (or use Plesk File Manager) and create a directory **outside** the
document root, owned by the subscription's system user:

```bash
mkdir -p ~/private_storage/boonhrm
chmod 700 ~/private_storage/boonhrm
```

Use its absolute path (e.g. `/var/www/vhosts/yourcompany.com/private_storage/boonhrm`)
as `PRIVATE_STORAGE_DIR`.

## 3. Get the code onto the server

Plesk → your domain → **Git**:

- Add this repository (Plesk can pull from GitHub or act as its own remote).
- Deployment path: the domain's app root (e.g. `/httpdocs` sibling directory
  such as `/boonhrm` — do **not** deploy into `httpdocs` itself; Node apps are
  served by Passenger, not from the docroot).
- Deploy actions: leave empty for now (step 6 adds the build script).

## 4. Node.js app settings

Plesk → your domain → **Node.js**:

| Setting | Value |
|---|---|
| Node.js version | 22 LTS (or newest LTS offered) |
| Document root | `/<app>/public` |
| Application mode | `production` |
| Application root | the Git deployment path |
| Application startup file | `server.js` |

Then click **NPM install** once (or rely on the deploy script below).

### Environment variables (same page)

```
DATABASE_URL        = mysql://USER:PASSWORD@localhost:3306/boonhrm
BETTER_AUTH_SECRET  = <openssl rand -base64 32>
BETTER_AUTH_URL     = https://hrm.yourcompany.com
APP_URL             = https://hrm.yourcompany.com
COMPANY_NAME        = Your Company
MS_TENANT_ID        = <from Azure app registration>
MS_CLIENT_ID        = <from Azure app registration>
MS_CLIENT_SECRET    = <from Azure app registration>
CAREERS_MAILBOX     = careers@yourcompany.com
PRIVATE_STORAGE_DIR = /var/www/vhosts/yourcompany.com/private_storage/boonhrm
SEED_ADMIN_EMAIL    = you@yourcompany.com
SEED_ADMIN_NAME     = Your Name
NODE_ENV            = production
```

## 5. HTTPS

Plesk → **SSL/TLS Certificates** → issue a **Let's Encrypt** certificate and
enable "Redirect from HTTP to HTTPS". Non-negotiable — login codes and candidate
PII travel over this domain.

## 6. Build & migrate (each deploy)

Plesk → Git → **Deploy actions**, or run over SSH from the app root:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
touch tmp/restart.txt   # tells Passenger to restart the app
```

First deploy only — seed the first admin:

```bash
npx tsx prisma/seed.ts
```

## 7. Scheduled task (75-day auto-reject)

Plesk → **Scheduled Tasks** → Add task (run as the subscription's system user):

- Command:
  `/opt/plesk/node/22/bin/node /var/www/vhosts/yourcompany.com/<app>/node_modules/.bin/tsx /var/www/vhosts/yourcompany.com/<app>/scripts/auto-reject-stale.ts`
- Schedule: daily, e.g. 03:00.
- Plesk runs tasks in a chrooted shell — use **absolute paths** for both node
  and the script, and confirm the task's environment includes the same
  `DATABASE_URL` (set env vars in the task line if needed:
  `DATABASE_URL=... /opt/plesk/node/22/bin/node ...`).

Run it once manually from the task UI and check the output ends with
`[auto-reject] Done`.

## 8. Smoke test

1. Open `https://hrm.yourcompany.com` → redirected to `/login`.
2. Request an OTP for the seeded admin → the code should arrive in that inbox
   (this proves the whole Graph/M365 chain).
3. Create a job opening, add a candidate, drag them to Interview → invite email
   arrives with the URL you picked.
4. Check the candidate's **Emails** tab shows the sent message.

## Troubleshooting

- **502/503 from Passenger**: check Plesk → Node.js → "Show logs". Most common:
  missing env var (app throws at boot) or `npm ci`/build not run after a pull.
- **Emails not sending**: `MS_*` env vars wrong, admin consent not granted, or
  the RBAC scope doesn't cover the mailbox — see `M365-SETUP.md` §2.
- **OTP works in dev but not prod**: dev prints codes to the console instead of
  sending; production requires the Graph setup.
- **Passenger doesn't pick up changes**: `touch tmp/restart.txt` in the app
  root, or use the Node.js panel's **Restart App** button.
- **Fallback process model**: if Passenger misbehaves with Next.js, run
  `npm run start` under PM2 and switch the domain to a reverse proxy to
  `127.0.0.1:3000` via Plesk's Apache/nginx settings — the app itself needs no
  code change (`server.js` honours `PORT`).
