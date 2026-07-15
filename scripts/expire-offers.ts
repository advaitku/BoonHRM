// Moves APPROVED candidates whose offer link expired (2 days) without a
// response back to SHORTLIST. The offer page also does this lazily on visit —
// this sweep catches candidates who never revisit the link.
//
// Runs daily via a Plesk Scheduled Task (alongside auto-reject-stale.ts):
//   /opt/plesk/node/<ver>/bin/node <app>/node_modules/.bin/tsx <app>/scripts/expire-offers.ts
//
// No emails are sent.
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { expireOfferToShortlist } from "../lib/offer";

async function main() {
  const stale = await prisma.candidate.findMany({
    where: {
      stage: "APPROVED",
      offerTokenExpiresAt: { lt: new Date() },
      offerAcceptedAt: null,
      offerDeclinedAt: null,
    },
    select: { id: true, fullName: true },
  });

  if (stale.length === 0) {
    console.log("[expire-offers] Nothing to do.");
    return;
  }

  for (const candidate of stale) {
    await expireOfferToShortlist(candidate.id, "APPROVED");
    console.log(`[expire-offers] ${candidate.fullName} (APPROVED → SHORTLIST, offer expired)`);
  }

  console.log(`[expire-offers] Done — ${stale.length} offer(s) expired.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[expire-offers] FAILED:", e);
    process.exit(1);
  });
