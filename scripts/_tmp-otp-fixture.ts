// TEMP — OTP e2e fixture (deleted after testing).
// Creates a pending offer candidate; optionally plants a known OTP.
import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  generateOfferToken,
  hashOfferOtp,
  OFFER_TTL_DAYS,
  OFFER_OTP_TTL_MINUTES,
} from "../lib/offer";

const KNOWN_OTP = "123456";

async function main() {
  const mode = process.argv[2] ?? "create";
  const id = "otp-test-candidate";

  if (mode === "plant-otp") {
    await prisma.candidate.update({
      where: { id },
      data: {
        offerOtpHash: hashOfferOtp(id, KNOWN_OTP),
        offerOtpExpiresAt: new Date(Date.now() + OFFER_OTP_TTL_MINUTES * 60_000),
        offerOtpAttempts: 0,
      },
    });
    console.log(JSON.stringify({ planted: KNOWN_OTP }));
    return;
  }

  if (mode === "inspect") {
    const c = await prisma.candidate.findUnique({
      where: { id },
      select: {
        stage: true,
        offerAcceptedAt: true,
        offerOtpHash: true,
        offerOtpExpiresAt: true,
        offerOtpAttempts: true,
      },
    });
    console.log(
      JSON.stringify({
        stage: c?.stage,
        accepted: Boolean(c?.offerAcceptedAt),
        hasOtp: Boolean(c?.offerOtpHash),
        otpExpiresAt: c?.offerOtpExpiresAt?.toISOString() ?? null,
        attempts: c?.offerOtpAttempts,
      }),
    );
    return;
  }

  if (mode === "cleanup") {
    const { count } = await prisma.candidate.deleteMany({ where: { id } });
    console.log(JSON.stringify({ deleted: count }));
    return;
  }

  // create
  const opening = await prisma.jobOpening.findFirstOrThrow({ where: { status: "OPEN" } });
  await prisma.candidate.deleteMany({ where: { id } });
  const token = generateOfferToken();
  await prisma.candidate.create({
    data: {
      id,
      jobOpeningId: opening.id,
      fullName: "OTP Tester",
      email: "otp-test@example.com",
      stage: "APPROVED",
      stageEnteredAt: new Date(),
      approvedAt: new Date(),
      ctcDetails: "CTC ₹9,00,000 per annum",
      dateOfJoining: new Date("2026-09-01T00:00:00Z"),
      offerToken: token,
      offerTokenExpiresAt: new Date(Date.now() + OFFER_TTL_DAYS * 86_400_000),
    },
  });
  console.log(JSON.stringify({ token }));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
