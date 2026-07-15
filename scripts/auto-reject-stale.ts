// Auto-rejects candidates stuck in the pipeline (Pool / Interview / Shortlist)
// for more than AUTO_REJECT_DAYS (default 75) since creation.
//
// Runs daily via a Plesk Scheduled Task:
//   /opt/plesk/node/<ver>/bin/node <app>/node_modules/.bin/tsx <app>/scripts/auto-reject-stale.ts
//
// Sends the polite rejection email when the opening's auto-notify is on.
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { sendStageEmail } from "../lib/email/stage-emails";
import { getAutoRejectDays } from "../lib/settings";

async function main() {
  const DAYS = await getAutoRejectDays();
  const REASON = `Auto-rejected after ${DAYS} days in the pipeline`;
  const cutoff = new Date(Date.now() - DAYS * 86_400_000);

  const stale = await prisma.candidate.findMany({
    where: {
      stage: { in: ["POOL", "INTERVIEW", "SHORTLIST"] },
      createdAt: { lt: cutoff },
    },
    select: { id: true, fullName: true, stage: true },
  });

  if (stale.length === 0) {
    console.log(`[auto-reject] Nothing to do (cutoff: ${cutoff.toISOString()}).`);
    return;
  }

  let rejected = 0;
  for (const candidate of stale) {
    await prisma.$transaction([
      prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          stage: "REJECTED",
          stageEnteredAt: new Date(),
          rejectionType: "COMPANY_REJECTED",
          rejectionReason: REASON,
          rejectedAt: new Date(),
        },
      }),
      prisma.candidateStageHistory.create({
        data: {
          candidateId: candidate.id,
          fromStage: candidate.stage,
          toStage: "REJECTED",
          movedById: null, // system
          rejectionType: "COMPANY_REJECTED",
          rejectionReason: REASON,
        },
      }),
    ]);

    try {
      await sendStageEmail({
        candidateId: candidate.id,
        toStage: "REJECTED",
        interviewUrlKind: "none",
        ctcDetails: null,
        rejectionType: "COMPANY_REJECTED",
        movedById: null,
      });
    } catch (error) {
      console.error(`[auto-reject] Email failed for ${candidate.fullName}:`, error);
    }

    rejected++;
    console.log(`[auto-reject] ${candidate.fullName} (${candidate.stage} → REJECTED)`);
  }

  console.log(`[auto-reject] Done — ${rejected}/${stale.length} candidate(s) auto-rejected.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[auto-reject] FAILED:", e);
    process.exit(1);
  });
