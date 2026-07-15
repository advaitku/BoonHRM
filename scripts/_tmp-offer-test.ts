// TEMP verification fixture — deleted after testing.
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { generateOfferToken, OFFER_TTL_DAYS, offerUrl } from "../lib/offer";

async function main() {
  let opening = await prisma.jobOpening.findFirst({ where: { status: "OPEN" } });
  if (!opening) {
    opening = await prisma.jobOpening.create({
      data: { title: "Offer Test Engineer", location: "Mumbai", positions: 1 },
    });
  }

  // Delete any prior fixture candidate so we start fresh.
  await prisma.candidate.deleteMany({ where: { id: "offer-test-candidate" } });

  const token = generateOfferToken();
  const now = new Date();
  const candidate = await prisma.candidate.create({
    data: {
      id: "offer-test-candidate",
      jobOpeningId: opening.id,
      fullName: "Offer Test Candidate",
      email: "Offer.Test@Example.com",
      stage: "APPROVED",
      stageEnteredAt: now,
      approvedAt: now,
      ctcDetails:
        "CTC ₹12,00,000 per annum\nFixed: ₹10,80,000 · Variable: ₹1,20,000",
      dateOfJoining: new Date("2026-09-01T00:00:00Z"),
      offerToken: token,
      offerTokenExpiresAt: new Date(now.getTime() + OFFER_TTL_DAYS * 86_400_000),
      offerAcceptedAt: now, // <-- already accepted
      offerDeclinedAt: null,
    },
  });

  console.log(
    JSON.stringify({
      candidateId: candidate.id,
      token,
      url: offerUrl(token),
      state: "accepted",
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
