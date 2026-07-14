import { prisma } from "@/lib/prisma";
import { graphConfigured } from "@/lib/email/send";
import { sendGraphMail } from "@/lib/email/graph-send";
import {
  approvalEmail,
  interviewInviteEmail,
  rejectionEmail,
} from "@/lib/email/templates";
import type {
  MailType,
  RejectionType,
  Stage,
} from "@/lib/generated/prisma/enums";

export interface StageEmailInput {
  candidateId: string;
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
 * and records it on the candidate's email thread.
 *
 * Send rules:
 *  - INTERVIEW: only when the dialog chose a URL (explicitSend).
 *  - REJECTED:  automatic when the opening's autoNotify is on.
 *  - APPROVED:  when the dialog confirmed (explicitSend).
 *  - POOL / SHORTLIST: never.
 */
export async function sendStageEmail(input: StageEmailInput): Promise<void> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: input.candidateId },
    include: { jobOpening: true },
  });
  if (!candidate?.email) return;

  const opening = candidate.jobOpening;
  let mailType: MailType;
  let subject: string;
  let html: string;

  switch (input.toStage) {
    case "INTERVIEW": {
      if (!input.explicitSend || input.interviewUrlKind === "none") return;
      const url =
        input.interviewUrlKind === "online"
          ? opening.onlineInterviewUrl
          : opening.inPersonInterviewUrl;
      if (!url) return;
      ({ subject, html } = interviewInviteEmail({
        candidateName: candidate.fullName,
        jobTitle: opening.title,
        url,
        kind: input.interviewUrlKind,
      }));
      mailType = "INTERVIEW_INVITE";
      break;
    }
    case "REJECTED": {
      if (!opening.autoNotify) return;
      ({ subject, html } = rejectionEmail({
        candidateName: candidate.fullName,
        jobTitle: opening.title,
      }));
      mailType = "REJECTION";
      break;
    }
    case "APPROVED": {
      if (input.explicitSend === false) return;
      ({ subject, html } = approvalEmail({
        candidateName: candidate.fullName,
        jobTitle: opening.title,
        ctcDetails: input.ctcDetails ?? candidate.ctcDetails,
      }));
      mailType = "APPROVAL";
      break;
    }
    default:
      return;
  }

  await deliverCandidateEmail({
    candidateId: candidate.id,
    to: candidate.email,
    subject,
    html,
    mailType,
  });
}

/**
 * Shared delivery: sends via Microsoft Graph when configured (dev: logs to the
 * console instead) and records an EmailMessage on the candidate's thread —
 * including the Graph conversationId, which V2 reply-threading matches on.
 */
export async function deliverCandidateEmail(opts: {
  candidateId: string;
  to: string;
  subject: string;
  html: string;
  mailType: MailType;
}): Promise<void> {
  let graphMessageId: string | null = null;
  let conversationId: string | null = null;
  let internetMessageId: string | null = null;

  if (graphConfigured()) {
    const result = await sendGraphMail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    graphMessageId = result.graphMessageId;
    conversationId = result.conversationId;
    internetMessageId = result.internetMessageId;
  } else {
    console.log(
      `\n[BoonHRM] (dev) email "${opts.subject}" -> ${opts.to} (${opts.mailType}) — Graph not configured, not actually sent.\n`,
    );
  }

  const thread = await prisma.emailThread.upsert({
    where: { candidateId: opts.candidateId },
    create: {
      candidateId: opts.candidateId,
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
