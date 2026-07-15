// TEMP verification fixture — second sample (pending). Deleted after testing.
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

  await prisma.candidate.deleteMany({ where: { id: "offer-sample-2" } });

  const token = generateOfferToken();
  const now = new Date();
  const candidate = await prisma.candidate.create({
    data: {
      id: "offer-sample-2",
      jobOpeningId: opening.id,
      fullName: "Priya Sharma",
      email: "Priya.Sample@Example.com",
      stage: "APPROVED",
      stageEnteredAt: now,
      approvedAt: now,
      ctcDetails:
        "CTC ₹18,00,000 per annum\nFixed: ₹16,20,000 · Variable: ₹1,80,000",
      dateOfJoining: new Date("2026-10-01T00:00:00Z"),
      offerToken: token,
      offerTokenExpiresAt: new Date(now.getTime() + OFFER_TTL_DAYS * 86_400_000),
      offerAcceptedAt: null, // pending — full flow visible
      offerDeclinedAt: null,
    },
  });

  console.log(
    JSON.stringify({
      candidateId: candidate.id,
      email: candidate.email,
      token,
      url: offerUrl(token),
      state: "pending",
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
