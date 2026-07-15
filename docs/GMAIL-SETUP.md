# Sending email through Gmail (interim setup)

BoonHRM can send all its email (login OTP codes, interview invites, rejection
and approval notices) through a standard Gmail / Google Workspace account over
SMTP. This is the quick path — no Azure setup needed. You can switch to
Microsoft 365 Graph later by filling the `MS_*` env vars instead
(`docs/M365-SETUP.md`); no code changes required.

## 1. Create an App Password

Google no longer allows plain passwords for SMTP. You need an **App Password**:

1. The Gmail account must have **2-Step Verification enabled**
   (myaccount.google.com → Security).
2. Go to <https://myaccount.google.com/apppasswords>.
3. Create a new app password (name it e.g. `BoonHRM`) and copy the
   **16-character code**.

## 2. Configure the environment

In `.env` (dev) or the Plesk Node.js panel (prod):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=recruiting@yourcompany.com
SMTP_PASS=<the 16-char app password>
MAIL_FROM=Your Company Recruitment <recruiting@yourcompany.com>
```

Nothing else is needed — with SMTP creds present the app picks the `smtp`
provider automatically (or force it with `MAIL_PROVIDER=smtp`).

## 3. Verify

Request a sign-in code at `/login` — it should arrive in the target inbox.
Then move a test candidate to Interview and confirm the invite lands.

## Notes & limits

- **From address**: Gmail rewrites the sender to the authenticated account;
  `MAIL_FROM` effectively just sets the display name.
- **Sending limits**: ~500 recipients/day (consumer Gmail) or ~2,000/day
  (Workspace) — far above what an internal ATS sends.
- **Replies**: candidate replies go to the Gmail inbox. They are NOT pulled
  into BoonHRM yet — the reply-threading feature (V2) is built around the
  Microsoft Graph API, which is one reason to switch later.
- **Deliverability**: for candidate-facing email, a Workspace address on your
  own domain looks more professional than an @gmail.com address and is less
  likely to land in spam.
