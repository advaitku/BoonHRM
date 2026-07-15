// Microsoft Graph outbound email (app-only auth, single shared mailbox).
// Config comes from Settings → Email (env fallback); see docs/M365-SETUP.md.
//
// Uses draft-then-send instead of /sendMail: creating the draft returns the
// message's id, conversationId and internetMessageId immediately (sendMail
// returns 202 with no body), which we store for V2 reply threading.
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";
import type { MailSettings } from "@/lib/settings";

export interface GraphSendResult {
  graphMessageId: string;
  conversationId: string | null;
  internetMessageId: string | null;
}

let cached: { key: string; client: Client } | null = null;

function graphClient(settings: MailSettings): Client {
  const { msTenantId, msClientId, msClientSecret } = settings;
  if (!msTenantId || !msClientId || !msClientSecret) {
    throw new Error("Microsoft Graph is not configured (tenant/client/secret missing)");
  }
  const key = `${msTenantId}:${msClientId}:${msClientSecret}`;
  if (cached?.key === key) return cached.client;

  const credential = new ClientSecretCredential(msTenantId, msClientId, msClientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });
  const client = Client.initWithMiddleware({ authProvider });
  cached = { key, client };
  return client;
}

export async function sendGraphMail(
  settings: MailSettings,
  input: { to: string; subject: string; html: string },
): Promise<GraphSendResult> {
  if (!settings.careersMailbox) {
    throw new Error("Graph sender mailbox is not configured");
  }

  const client = graphClient(settings);
  const base = `/users/${encodeURIComponent(settings.careersMailbox)}`;

  const draft = await client.api(`${base}/messages`).post({
    subject: input.subject,
    toRecipients: [{ emailAddress: { address: input.to } }],
    body: { contentType: "HTML", content: input.html },
  });

  await client.api(`${base}/messages/${draft.id}/send`).post({});

  return {
    graphMessageId: draft.id,
    conversationId: draft.conversationId ?? null,
    internetMessageId: draft.internetMessageId ?? null,
  };
}
