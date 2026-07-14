"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { sendStageEmail } from "@/lib/email/stage-emails";

const moveSchema = z.object({
  candidateId: z.string().min(1),
  toStage: z.enum(["POOL", "INTERVIEW", "SHORTLIST", "REJECTED", "APPROVED"]),
  // Required when moving to REJECTED
  rejectionType: z.enum(["CANDIDATE_DECLINED", "COMPANY_REJECTED"]).optional(),
  rejectionReason: z.string().trim().max(2000).optional(),
  // Interview invite email (moving to INTERVIEW)
  interviewUrlKind: z.enum(["online", "inPerson", "none"]).optional(),
  // Approval details (moving to APPROVED)
  ctcDetails: z.string().trim().max(4000).optional(),
  sendEmail: z.boolean().optional(),
});

export type MoveInput = z.infer<typeof moveSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function moveCandidateStage(input: MoveInput): Promise<ActionResult> {
  const session = await requireUser();

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid move" };
  }
  const {
    candidateId,
    toStage,
    rejectionType,
    rejectionReason,
    interviewUrlKind,
    ctcDetails,
    sendEmail,
  } = parsed.data;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { jobOpening: true },
  });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  const fromStage = candidate.stage;
  if (fromStage === toStage) return { ok: true };

  if (toStage === "REJECTED" && !rejectionType) {
    return { ok: false, error: "Rejection type is required" };
  }

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: {
        stage: toStage,
        stageEnteredAt: new Date(),
        // Rejection fields: set on entry, cleared on exit.
        rejectionType: toStage === "REJECTED" ? rejectionType : null,
        rejectionReason: toStage === "REJECTED" ? (rejectionReason ?? null) : null,
        rejectedAt: toStage === "REJECTED" ? new Date() : null,
        // Approval fields: set on entry; kept for the record on exit.
        ...(toStage === "APPROVED"
          ? { approvedAt: new Date(), ctcDetails: ctcDetails ?? candidate.ctcDetails }
          : fromStage === "APPROVED"
            ? { approvedAt: null }
            : {}),
      },
    }),
    prisma.candidateStageHistory.create({
      data: {
        candidateId,
        fromStage,
        toStage,
        movedById: session.user.id,
        rejectionType: toStage === "REJECTED" ? rejectionType : null,
        rejectionReason: toStage === "REJECTED" ? (rejectionReason ?? null) : null,
      },
    }),
  ]);

  // Email side effects (M6): interview invite / rejection / approval.
  try {
    await sendStageEmail({
      candidateId,
      toStage,
      interviewUrlKind: interviewUrlKind ?? "none",
      ctcDetails: ctcDetails ?? null,
      rejectionType: rejectionType ?? null,
      explicitSend: sendEmail,
      movedById: session.user.id,
    });
  } catch (error) {
    console.error("Stage email failed (move already applied):", error);
  }

  revalidatePath(`/job-openings/${candidate.jobOpeningId}`);
  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true };
}
