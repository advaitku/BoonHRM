// Microsoft Graph outbound email (app-only auth, single shared mailbox).
//
// Uses draft-then-send instead of /sendMail: creating the draft returns the
// message's id, conversationId and internetMessageId immediately (sendMail
// returns 202 with no body), which we store for V2 reply threading.
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

export interface GraphMailInput {
  to: string;
  subject: string;
  html: string;
}

export interface GraphSendResult {
  graphMessageId: string;
  conversationId: string | null;
  internetMessageId: string | null;
}

let cachedClient: Client | null = null;

function graphClient(): Client {
  if (cachedClient) return cachedClient;
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Graph env vars (MS_*) are not configured");
  }
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });
  cachedClient = Client.initWithMiddleware({ authProvider });
  return cachedClient;
}

export async function sendGraphMail(
  input: GraphMailInput,
): Promise<GraphSendResult> {
  const mailbox = process.env.CAREERS_MAILBOX;
  if (!mailbox) throw new Error("CAREERS_MAILBOX is not configured");

  const client = graphClient();
  const base = `/users/${encodeURIComponent(mailbox)}`;

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
