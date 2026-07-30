import { prisma } from "@/lib/prisma";
import { mailConfigured, sendMail } from "@/lib/email/transport";
import { renderCandidateEmail } from "@/lib/email/templates";
import { offerUrl } from "@/lib/offer";
import type {
  MailType,
  RejectionType,
  Stage,
} from "@/lib/generated/prisma/enums";

export interface StageEmailInput {
  applicationId: string;
  toStage: Stage;
  interviewUrlKind: "online" | "inPerson" | "none";
  ctcDetails: string | null;
  rejectionType: RejectionType | null;
  /** Explicit user choice from the dialog (undefined = follow autoNotify). */
  explicitSend?: boolean;
  movedById: string | null;
}

/**
 * Sends the stage-transition email (interview invite / rejection / approval)
 * and records it on the application's email thread.
 *
 * Send rules:
 *  - INTERVIEW: only when the dialog chose a URL (explicitSend).
 *  - REJECTED:  automatic when the opening's autoNotify is on.
 *  - APPROVED:  when the dialog confirmed (explicitSend).
 *  - POOL / SHORTLIST: never.
 */
export async function sendStageEmail(input: StageEmailInput): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: { candidate: true, jobOpening: true },
  });
  const email = application?.candidate.email;
  if (!application || !email) return;

  const { candidate, jobOpening: opening } = application;
  let mailType: MailType;
  let subject: string;
  let html: string;
  let text: string;

  switch (input.toStage) {
    case "INTERVIEW": {
      if (!input.explicitSend || input.interviewUrlKind === "none") return;
      const url =
        input.interviewUrlKind === "online"
          ? opening.onlineInterviewUrl
          : opening.inPersonInterviewUrl;
      if (!url) return;
      ({ subject, html, text } = await renderCandidateEmail("INTERVIEW_INVITE", {
        candidateName: candidate.fullName,
        jobTitle: opening.title,
        interviewUrl: url,
        interviewKind: input.interviewUrlKind,
        interviewDeadline: opening.interviewDeadline,
      }));
      mailType = "INTERVIEW_INVITE";
      break;
    }
    case "REJECTED": {
      if (!opening.autoNotify) return;
      ({ subject, html, text } = await renderCandidateEmail("REJECTION", {
        candidateName: candidate.fullName,
        jobTitle: opening.title,
      }));
      mailType = "REJECTION";
      break;
    }
    case "APPROVED": {
      if (input.explicitSend === false) return;
      if (!application.offerToken) return; // no live offer link, nothing to send
      const url = offerUrl(application.offerToken);
      if (!(await mailConfigured())) {
        console.log(`\n[BoonHRM] (dev) offer link for ${candidate.fullName}: ${url}\n`);
      }
      ({ subject, html, text } = await renderCandidateEmail("APPROVAL", {
        candidateName: candidate.fullName,
        jobTitle: opening.title,
        offerUrl: url,
      }));
      mailType = "APPROVAL";
      break;
    }
    default:
      return;
  }

  await deliverCandidateEmail({
    applicationId: application.id,
    to: email,
    subject,
    html,
    text,
    mailType,
  });
}

/**
 * Shared delivery: sends via the configured provider — Gmail/SMTP or Microsoft
 * Graph (console in dev) — and records an EmailMessage on the application's
 * thread. Graph additionally captures conversationId for V2 reply-threading;
 * SMTP sends record the Message-ID header for the header-based fallback.
 */
export async function deliverCandidateEmail(opts: {
  applicationId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  mailType: MailType;
}): Promise<void> {
  const { graphMessageId, conversationId, internetMessageId } = await sendMail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  const thread = await prisma.emailThread.upsert({
    where: { applicationId: opts.applicationId },
    create: {
      applicationId: opts.applicationId,
      subject: opts.subject,
      conversationId,
    },
    update: {},
  });
  // Adopt the first real conversationId we see; never overwrite an existing one.
  if (conversationId && !thread.conversationId) {
    await prisma.emailThread.update({
      where: { id: thread.id },
      data: { conversationId },
    });
  }

  await prisma.emailMessage.create({
    data: {
      emailThreadId: thread.id,
      direction: "OUTBOUND",
      mailType: opts.mailType,
      graphMessageId,
      conversationId,
      internetMessageId,
      toAddresses: opts.to,
      subject: opts.subject,
      bodyHtml: opts.html,
      occurredAt: new Date(),
    },
  });
}
