// Candidate email templates: admin-editable (Settings → Email templates),
// stored as plain text with {{placeholders}} and rendered into a brand shell.
// Email-client-safe HTML (inline styles only).
import { prisma } from "@/lib/prisma";
import { getCompanyName } from "@/lib/settings";
import type { MailType } from "@/lib/generated/prisma/enums";

export type EditableMailType = "INTERVIEW_INVITE" | "REJECTION" | "APPROVAL";

export interface TemplateVars {
  candidateName: string;
  jobTitle: string;
  interviewUrl?: string;
  interviewKind?: "online" | "inPerson";
  ctcDetails?: string | null;
  offerUrl?: string;
}

export const TEMPLATE_META: Record<
  EditableMailType,
  { label: string; description: string; placeholders: string[] }
> = {
  INTERVIEW_INVITE: {
    label: "Interview invitation",
    description:
      "Sent when a candidate is moved to Interview and a link is chosen. The interview link is added as a button after your text.",
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{companyName}}", "{{interviewUrl}}"],
  },
  REJECTION: {
    label: "Rejection",
    description:
      "Sent when a candidate is rejected (and by the auto-reject sweep) when the opening's auto-notify is on.",
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{companyName}}"],
  },
  APPROVAL: {
    label: "Approval / offer link",
    description:
      "Sent when a candidate is approved. Contains a secure link to their offer page (valid 2 days) — CTC details are shown on the offer page, not in the email. The link is added as a button after your text, or write {{offerUrl}} to place it inline.",
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{companyName}}", "{{offerUrl}}"],
  },
};

export const DEFAULT_TEMPLATES: Record<
  EditableMailType,
  { subject: string; body: string }
> = {
  INTERVIEW_INVITE: {
    subject: "Interview invitation — {{jobTitle}}",
    body: `Hi {{candidateName}},

Thank you for your interest in the {{jobTitle}} role at {{companyName}}. We've reviewed your profile and would like to move forward with an interview.

Please use the link below to schedule / join your interview.

If the time doesn't work for you, simply reply to this email and we'll figure something out.

Best regards,
The {{companyName}} hiring team`,
  },
  REJECTION: {
    subject: "Update on your application — {{jobTitle}}",
    body: `Hi {{candidateName}},

Thank you for taking the time to apply for the {{jobTitle}} position at {{companyName}} and for the effort you put into the process.

After careful consideration, we've decided not to move forward with your application at this time. This was not an easy decision — we were fortunate to receive interest from many strong candidates.

We'll keep your profile on file and would be glad to reconsider you for future openings that match your experience.

We wish you every success in your search.

Warm regards,
The {{companyName}} hiring team`,
  },
  APPROVAL: {
    subject: "Congratulations — your offer for {{jobTitle}}",
    body: `Hi {{candidateName}},

We're delighted to let you know that you've been selected for the {{jobTitle}} position at {{companyName}}. Congratulations!

Please view and respond to your offer using the secure link below. You'll be asked to confirm your email address before the offer is shown.

Note: the link is valid for 2 days only.

If you have any questions in the meantime, just reply to this email.

We can't wait to have you on the team!

Best regards,
The {{companyName}} hiring team`,
  },
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

// Brand shell — Boon deep teal header, chalk background, square corners.
function shell(companyName: string, title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:'DM Sans',Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ececec;">
          <tr>
            <td style="background:#023c3c;padding:18px 28px;">
              <span style="color:#f5f5f5;font-size:16px;font-weight:600;letter-spacing:0.02em;">${escapeHtml(companyName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#023c3c;">${escapeHtml(title)}</h1>
              <div style="font-size:14px;line-height:1.7;color:#1e1919;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #ececec;">
              <p style="margin:0;font-size:12px;color:#666666;">This email was sent by ${escapeHtml(companyName)} recruitment. Please reply to this email if you have any questions.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#023c3c;color:#f5f5f5;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;">${escapeHtml(label)}</a>
  </p>
  <p style="font-size:12px;color:#666666;word-break:break-all;">Or copy this link: ${escapeHtml(href)}</p>`;
}

/** Load the template (DB override or default), interpolate, wrap in the shell. */
export async function renderCandidateEmail(
  type: EditableMailType,
  vars: TemplateVars,
): Promise<{ subject: string; html: string }> {
  const companyName = await getCompanyName();
  const override = await prisma.emailTemplate.findUnique({ where: { type } });
  const template = override ?? DEFAULT_TEMPLATES[type];

  const stringVars: Record<string, string> = {
    candidateName: vars.candidateName,
    jobTitle: vars.jobTitle,
    companyName,
    interviewUrl: vars.interviewUrl ?? "",
    ctcDetails: vars.ctcDetails ?? "",
    offerUrl: vars.offerUrl ?? "",
  };

  const subject = interpolate(template.subject, stringVars);
  let bodyHtml = nl2br(interpolate(template.body, stringVars));

  if (type === "INTERVIEW_INVITE" && vars.interviewUrl) {
    bodyHtml += button(
      vars.interviewUrl,
      vars.interviewKind === "inPerson" ? "Interview details" : "Join / schedule interview",
    );
  }
  if (
    type === "APPROVAL" &&
    vars.offerUrl &&
    !template.body.includes("{{offerUrl}}")
  ) {
    bodyHtml += button(vars.offerUrl, "View your offer");
  }

  const title =
    type === "APPROVAL"
      ? `Welcome aboard, ${vars.candidateName}!`
      : type === "INTERVIEW_INVITE"
        ? `Congratulations, ${vars.candidateName}!`
        : `Thank you, ${vars.candidateName}`;

  return { subject, html: shell(companyName, title, bodyHtml) };
}

/** OTP email (not admin-editable). */
export async function otpEmail(otp: string): Promise<{ subject: string; html: string }> {
  const companyName = await getCompanyName();
  return {
    subject: "Your BoonHRM sign-in code",
    html: shell(companyName, "Your sign-in code", `
      <p>Use this code to sign in to BoonHRM:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#023c3c;margin:20px 0;">${escapeHtml(otp)}</p>
      <p>The code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
    `),
  };
}

/** Offer-page verification code (not admin-editable, mirrors the login OTP). */
export async function offerOtpEmail(otp: string): Promise<{ subject: string; html: string }> {
  const companyName = await getCompanyName();
  return {
    subject: `${otp} is your offer verification code`,
    html: shell(companyName, "Verify your email", `
      <p>Use this code to view and respond to your offer from ${escapeHtml(companyName)}:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#023c3c;margin:20px 0;">${escapeHtml(otp)}</p>
      <p>The code expires in 15 minutes. If you didn't request it, you can safely ignore this email — your offer link stays private.</p>
    `),
  };
}

/** Internal HR notification when a candidate responds to their offer. */
export async function offerResponseNotification(opts: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  decision: "accepted" | "declined";
}): Promise<{ subject: string; html: string }> {
  const companyName = await getCompanyName();
  const verb = opts.decision === "accepted" ? "accepted" : "declined";
  return {
    subject: `Offer ${verb} — ${opts.candidateName} (${opts.jobTitle})`,
    html: shell(companyName, `Offer ${verb}`, `
      <p><strong>${escapeHtml(opts.candidateName)}</strong> (${escapeHtml(opts.candidateEmail)}) has <strong>${verb}</strong> the offer for the <strong>${escapeHtml(opts.jobTitle)}</strong> position via the offer page.</p>
      ${
        opts.decision === "accepted"
          ? `<p>The candidate has been told that finalization is contingent on background verification. Please start the verification process and share the next steps with them.</p>`
          : `<p>The candidate has been moved to Rejected (candidate declined) automatically.</p>`
      }
      <p>Open BoonHRM to view the candidate's full record.</p>
    `),
  };
}

/** Used by the Settings preview pane. */
export async function getTemplateForEditing(type: EditableMailType) {
  const override = await prisma.emailTemplate.findUnique({ where: { type } });
  return {
    type,
    subject: override?.subject ?? DEFAULT_TEMPLATES[type].subject,
    body: override?.body ?? DEFAULT_TEMPLATES[type].body,
    isCustomized: Boolean(override),
  };
}

export function isEditableMailType(t: MailType): t is EditableMailType {
  return t === "INTERVIEW_INVITE" || t === "REJECTION" || t === "APPROVAL";
}
