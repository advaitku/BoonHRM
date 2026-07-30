# Sending email through SMTP (Gmail, Workspace, Amazon SES, …)

BoonHRM can send its email through any standard SMTP server — Gmail /
Google Workspace, Amazon SES, or otherwise. This is the quick path — no
Azure setup needed. You can switch a channel to Microsoft 365 Graph instead
by filling its `MS_*` fields (`docs/M365-SETUP.md`); no code changes
required.

## Two independent channels

Outbound mail is split into two channels that are configured and resolved
**completely independently** (Settings → Email, both tabs; or the env vars
below):

- **Sign-in codes** — the login OTP and the offer-page verification code.
  These are security-critical: if this channel breaks, nobody can log in.
- **Recruiting mail** — interview invite, rejection, approval.

Each can point at a different SMTP server/account (e.g. Amazon SES for
recruiting mail, Gmail for sign-in codes) with no effect on the other. If a
channel's settings aren't explicitly configured in the DB (Settings → Email),
it falls back to the same environment variables as the other channel — so an
existing single-provider setup keeps working unchanged until you configure
one channel differently.

## 1. Gmail / Workspace: create an App Password

Google no longer allows plain passwords for SMTP. You need an **App Password**:

1. The Gmail account must have **2-Step Verification enabled**
   (myaccount.google.com → Security).
2. Go to <https://myaccount.google.com/apppasswords>.
3. Create a new app password (name it e.g. `BoonHRM`) and copy the
   **16-character code**.

## 1b. Amazon SES: create SMTP credentials

SES's SMTP username/password are **not** your AWS access key — generate them
separately:

1. In the SES console, verify the sending domain or email address you'll
   send from (and request production access if the account is still in the
   SES sandbox — sandbox accounts can only send to verified addresses).
2. SES console → **SMTP settings** → **Create SMTP credentials**. This
   creates a dedicated IAM user and gives you an SMTP username/password pair
   (shown once — save it).
3. Note the region's SMTP endpoint, e.g. `email-smtp.us-east-1.amazonaws.com`,
   port `587` (STARTTLS) or `465` (implicit TLS).

## 2. Configure the environment

In `.env` (dev) or the Plesk Node.js panel (prod) — these are the fallback
used by both channels unless overridden per-channel in Settings → Email:

```
SMTP_HOST=smtp.gmail.com                              # or email-smtp.us-east-1.amazonaws.com
SMTP_PORT=465
SMTP_USER=recruiting@yourcompany.com                   # or the SES-generated SMTP username
SMTP_PASS=<app password, or the SES-generated SMTP password>
MAIL_FROM=Your Company Recruitment <recruiting@yourcompany.com>
```

Nothing else is needed — with SMTP creds present the app picks the `smtp`
provider automatically (or force it with `MAIL_PROVIDER=smtp`). To point one
channel at a different provider than the other, use Settings → Email → the
relevant tab (Sign-in codes / Email) instead of env vars — DB settings there
override the env vars for that channel only.

## 3. Verify

Request a sign-in code at `/login` — it should arrive in the target inbox.
Then move a test candidate to Interview and confirm the invite lands.
`npm run mail:test` (or Plesk → Node.js → Run script → `mail:test`) sends a
real test email on **both** channels and prints the resolved provider and any
error for each.

## Notes & limits

- **From address**: Gmail rewrites the sender to the authenticated account;
  `MAIL_FROM` effectively just sets the display name. SES honors a verified
  From address directly.
- **Sending limits**: Gmail — ~500 recipients/day (consumer) or ~2,000/day
  (Workspace). SES — starts in a sandbox (200/day, verified recipients only)
  until you request production access. Both are far above what an internal
  ATS sends.
- **Replies**: candidate replies go to whichever inbox is configured as the
  SMTP user (Gmail) — SES sending addresses typically aren't monitored
  inboxes, so if you want candidates able to reply, keep recruiting mail on
  Gmail/Workspace or set `MAIL_FROM`/Reply-To to a real monitored address.
  Replies are NOT pulled into BoonHRM yet — the reply-threading feature (V2)
  is built around the Microsoft Graph API, which is one reason to switch
  later.
- **Deliverability**: for candidate-facing email, a Workspace/SES address on
  your own verified domain looks more professional than an @gmail.com
  address and is less likely to land in spam.

### If mail is landing in spam

The app already sends a plain-text alternative alongside every HTML email
(HTML-only mail is a common spam-score penalty) — if spam placement continues,
it's almost always domain authentication or reputation, not the app:

1. **SPF/DKIM/DMARC** — if `SMTP_USER` is on your own domain via Google
   Workspace, that domain's DNS needs an SPF record including Google
   (`include:_spf.google.com`) and DKIM enabled/verified in Google Admin
   (Apps → Gmail → Authenticate email). For SES, the SES console's domain
   verification flow gives you the DKIM CNAME records to add — without them,
   SES sends in a lower-trust "via amazonses.com" mode. Without proper
   SPF/DKIM, mail sent "as" your domain but not authorized for it is
   routinely spam-filtered or DMARC-quarantined by the recipient's mail
   server, regardless of content.
2. **New sender reputation** — a freshly configured address/domain has no
   sending history yet. Early volume commonly lands in spam until enough
   recipients open/reply/move it to inbox. Ask early recipients to do this,
   and for Gmail/Workspace consider registering the domain with
   [Google Postmaster Tools](https://postmaster.google.com) to monitor
   reputation.
3. **Content** — avoid subject lines that lead with a numeric code, and
   heavy "click here" + urgency phrasing; both are weighted by spam
   heuristics (already addressed for the built-in templates as of v0.2.1).
