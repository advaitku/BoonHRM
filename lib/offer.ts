// Offer-link helpers, shared by the app and tsx scripts (so: no `server-only`).
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/generated/prisma/enums";

/** How long a candidate has to respond to an offer link. */
export const OFFER_TTL_DAYS = 2;

/** Offer-page email OTP: initial validity + max wrong entries per code. */
export const OFFER_OTP_TTL_MINUTES = 15;
/** After a successful unlock the code stays valid this long, so the candidate
 * has time to read the offer before accepting/declining. */
export const OFFER_OTP_UNLOCKED_MINUTES = 30;
export const OFFER_OTP_MAX_ATTEMPTS = 5;

/** Unguessable public offer-link token (256 bits, URL-safe). */
export function generateOfferToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 6-digit offer verification code (crypto-random, zero-padded). */
export function generateOfferOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Codes are stored hashed, bound to the candidate so hashes aren't portable. */
export function hashOfferOtp(candidateId: string, otp: string): string {
  return createHash("sha256").update(`${candidateId}:${otp}`).digest("hex");
}

export function otpHashMatches(storedHash: string, candidateId: string, otp: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashOfferOtp(candidateId, otp), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function offerUrl(token: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/offer/${token}`;
}

export type OfferState = "pending" | "accepted" | "declined" | "expired";

export function getOfferState(candidate: {
  offerTokenExpiresAt: Date | null;
  offerAcceptedAt: Date | null;
  offerDeclinedAt: Date | null;
}): OfferState {
  if (candidate.offerAcceptedAt) return "accepted";
  if (candidate.offerDeclinedAt) return "declined";
  if (
    !candidate.offerTokenExpiresAt ||
    candidate.offerTokenExpiresAt.getTime() < Date.now()
  ) {
    return "expired";
  }
  return "pending";
}

/**
 * Expired-offer move: back to SHORTLIST as a system action. Keeps the token
 * columns so a revisited link renders "expired" rather than "not valid".
 * Used by both the daily sweep and the lazy request-time check.
 */
export async function expireOfferToShortlist(
  candidateId: string,
  fromStage: Stage,
): Promise<void> {
  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: {
        stage: "SHORTLIST",
        stageEnteredAt: new Date(),
        approvedAt: null,
      },
    }),
    prisma.candidateStageHistory.create({
      data: {
        candidateId,
        fromStage,
        toStage: "SHORTLIST",
        movedById: null, // system
      },
    }),
  ]);
}
