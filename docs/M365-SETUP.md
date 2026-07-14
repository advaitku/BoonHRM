# Microsoft 365 setup for BoonHRM email (Milestone 0)

BoonHRM sends all email (OTP login codes, interview invites, rejection and
approval notices) through **one shared mailbox** (e.g. `careers@yourcompany.com`)
using the **Microsoft Graph API** with **app-only** (client-credentials) auth.

This requires an **M365 tenant admin**. Until it's done, the app still runs in
local dev — OTP codes and emails print to the server console instead of sending.

## 1. Register an app in Entra ID (Azure AD)

1. Entra admin center → **App registrations** → **New registration**.
   - Name: `BoonHRM`. Single tenant. No redirect URI needed (app-only).
2. Note the **Application (client) ID** and **Directory (tenant) ID**.
3. **Certificates & secrets** → **New client secret** → copy the secret **value**.
4. **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Application permissions** → add **`Mail.Send`** (and `Mail.Read` later for
   V2 inbound). → **Grant admin consent**.

## 2. Scope the app to ONE mailbox (RBAC for Applications)

App permissions are tenant-wide by default. Restrict this app to only the
`careers@` mailbox. (`New-ApplicationAccessPolicy` was **deprecated Dec 2025** —
use **RBAC for Applications** instead.)

In Exchange Online PowerShell (`Connect-ExchangeOnline` as admin):

```powershell
# A scope that matches only the shared mailbox
New-ManagementScope -Name "BoonHRM-Careers" `
  -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'careers@yourcompany.com'"

# Grant the app's service principal Mail.Send limited to that scope
New-ManagementRoleAssignment -App <ServicePrincipalObjectId-or-AppId> `
  -Role "Application Mail.Send" `
  -CustomResourceScope "BoonHRM-Careers"

# (V2) repeat with -Role "Application Mail.Read" for inbound polling
```

## 3. Configure the app

Put these in the server's environment (Plesk Node.js panel in prod, `.env` in dev):

```
MS_TENANT_ID=<Directory (tenant) ID>
MS_CLIENT_ID=<Application (client) ID>
MS_CLIENT_SECRET=<client secret value>
CAREERS_MAILBOX=careers@yourcompany.com
```

## 4. Verify

Once set, sending an OTP or a stage email will go out from `careers@`. Test by
requesting an OTP at `/login`; the code should arrive in the target inbox rather
than the console.
