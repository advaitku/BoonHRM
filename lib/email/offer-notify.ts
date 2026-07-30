// Internal HR notification for offer accept/decline. Sent straight through
// the mail transport (console in dev) — NOT recorded on the candidate's
// EmailThread, since it isn't candidate correspondence.
import { sendMail } from "@/lib/email/transport";
import { offerResponseNotification } from "@/lib/email/templates";
import { getNotificationEmail } from "@/lib/settings";

export async function notifyOfferResponse(
  candidate: { fullName: string; email: string; jobOpening: { title: string } },
  decision: "accepted" | "declined",
): Promise<void> {
  const to = await getNotificationEmail();
  const { subject, html, text } = await offerResponseNotification({
    candidateName: candidate.fullName,
    candidateEmail: candidate.email,
    jobTitle: candidate.jobOpening.title,
    decision,
  });
  await sendMail({ to, subject, html, text });
}
