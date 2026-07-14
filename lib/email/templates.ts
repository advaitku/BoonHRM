
// Email-client-safe HTML templates (inline styles only). Kept deliberately
// simple and warm — these go to real candidates.

function companyName(): string {
  return process.env.COMPANY_NAME || "Our company";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#18181b;padding:18px 28px;">
              <span style="color:#fafafa;font-size:16px;font-weight:600;">${escapeHtml(companyName())}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">${escapeHtml(title)}</h1>
              <div style="font-size:14px;line-height:1.7;color:#3f3f46;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">This email was sent by ${escapeHtml(companyName())} recruitment. Please reply to this email if you have any questions.</p>
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
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a>
  </p>
  <p style="font-size:12px;color:#a1a1aa;word-break:break-all;">Or copy this link: ${escapeHtml(href)}</p>`;
}

export function interviewInviteEmail(opts: {
  candidateName: string;
  jobTitle: string;
  url: string;
  kind: "online" | "inPerson";
}): { subject: string; html: string } {
  const subject = `Interview invitation — ${opts.jobTitle}`;
  const intro =
    opts.kind === "online"
      ? `We'd love to speak with you! Please use the link below to join / schedule your <strong>online interview</strong> for the <strong>${escapeHtml(opts.jobTitle)}</strong> position.`
      : `We'd love to meet you! Please use the link below for details about your <strong>in-person interview</strong> for the <strong>${escapeHtml(opts.jobTitle)}</strong> position.`;
  const html = shell(`Congratulations, ${opts.candidateName}!`, `
    <p>Hi ${escapeHtml(opts.candidateName)},</p>
    <p>Thank you for your interest in the <strong>${escapeHtml(opts.jobTitle)}</strong> role at ${escapeHtml(companyName())}. We've reviewed your profile and would like to move forward with an interview.</p>
    <p>${intro}</p>
    ${button(opts.url, opts.kind === "online" ? "Join / schedule interview" : "Interview details")}
    <p>If the time doesn't work for you, simply reply to this email and we'll figure something out.</p>
    <p>Best regards,<br/>The ${escapeHtml(companyName())} hiring team</p>
  `);
  return { subject, html };
}

export function rejectionEmail(opts: {
  candidateName: string;
  jobTitle: string;
}): { subject: string; html: string } {
  const subject = `Update on your application — ${opts.jobTitle}`;
  const html = shell(`Thank you, ${opts.candidateName}`, `
    <p>Hi ${escapeHtml(opts.candidateName)},</p>
    <p>Thank you for taking the time to apply for the <strong>${escapeHtml(opts.jobTitle)}</strong> position at ${escapeHtml(companyName())} and for the effort you put into the process.</p>
    <p>After careful consideration, we've decided not to move forward with your application at this time. This was not an easy decision — we were fortunate to receive interest from many strong candidates.</p>
    <p>We'll keep your profile on file and would be glad to reconsider you for future openings that match your experience.</p>
    <p>We wish you every success in your search.</p>
    <p>Warm regards,<br/>The ${escapeHtml(companyName())} hiring team</p>
  `);
  return { subject, html };
}

export function approvalEmail(opts: {
  candidateName: string;
  jobTitle: string;
  ctcDetails: string | null;
}): { subject: string; html: string } {
  const subject = `Congratulations — ${opts.jobTitle}`;
  const html = shell(`Welcome aboard, ${opts.candidateName}! 🎉`, `
    <p>Hi ${escapeHtml(opts.candidateName)},</p>
    <p>We're delighted to let you know that you've been selected for the <strong>${escapeHtml(opts.jobTitle)}</strong> position at ${escapeHtml(companyName())}. Congratulations!</p>
    ${
      opts.ctcDetails
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr><td style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Offer details</p>
              <p style="margin:0;font-size:14px;color:#3f3f46;">${nl2br(opts.ctcDetails)}</p>
            </td></tr>
          </table>`
        : ""
    }
    <p>Our team will be in touch shortly with the next steps and the formal offer letter. If you have any questions in the meantime, just reply to this email.</p>
    <p>We can't wait to have you on the team!</p>
    <p>Best regards,<br/>The ${escapeHtml(companyName())} hiring team</p>
  `);
  return { subject, html };
}

export function otpEmail(otp: string): { subject: string; html: string } {
  const subject = "Your BoonHRM sign-in code";
  const html = shell("Your sign-in code", `
    <p>Use this code to sign in to BoonHRM:</p>
    <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#18181b;margin:20px 0;">${escapeHtml(otp)}</p>
    <p>The code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
  `);
  return { subject, html };
}
