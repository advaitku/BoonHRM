"use server";

// Public offer-page actions — deliberately NO requireUser(): the caller is the
// candidate, not a signed-in user. Auth = offer token + case-insensitive match
// against the candidate's email on file + a 6-digit email OTP proving inbox
// control, re-validated on every call. All failure messages are generic so
// nothing about the candidate leaks.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  expireOfferToShortlist,
  generateOfferOtp,
  getOfferState,
  hashOfferOtp,
  otpHashMatches,
  OFFER_OTP_MAX_ATTEMPTS,
  OFFER_OTP_TTL_MINUTES,
  OFFER_OTP_UNLOCKED_MINUTES,
} from "@/lib/offer";
import { getCompanyName, getOfferAgreement } from "@/lib/settings";
import { sendOtpMail } from "@/lib/email/transport";
import { offerOtpEmail } from "@/lib/email/templates";
import { notifyOfferResponse } from "@/lib/email/offer-notify";

const requestSchema = z.object({
  token: z.string().min(20).max(100),
  email: z.string().trim().email().max(200),
});

const unlockSchema = requestSchema.extend({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const respondSchema = unlockSchema.extend({
  decision: z.enum(["accept", "decline"]),
});

export interface OfferPayload {
  state: "pending" | "accepted" | "declined";
  candidateName: string;
  jobTitle: string;
  location: string | null;
  ctcDetails: string | null;
  /** ISO date (YYYY-MM-DD) or null. */
  dateOfJoining: string | null;
  agreement: string;
  companyName: string;
}

export type OfferResult =
  | { ok: true; offer: OfferPayload }
  | { ok: false; error: string };

export type OtpRequestResult = { ok: true } | { ok: false; error: string };

const GENERIC_INVALID = "This offer link is not valid.";
const GENERIC_EXPIRED =
  "This offer link has expired. Please contact the hiring team.";
const GENERIC_MISMATCH =
  "That email doesn't match our records for this offer.";
const OTP_EXPIRED = "That code has expired. Please request a new one.";
const OTP_LOCKED =
  "Too many incorrect attempts. Please request a new code.";
const OTP_WRONG = "Incorrect code. Please try again.";

interface ResolvedApplication {
  id: string;
  candidateId: string;
  jobOpeningId: string;
  stage: string;
  ctcDetails: string | null;
  dateOfJoining: Date | null;
  offerTokenExpiresAt: Date | null;
  offerAcceptedAt: Date | null;
  offerDeclinedAt: Date | null;
  offerOtpHash: string | null;
  offerOtpExpiresAt: Date | null;
  offerOtpAttempts: number;
  candidate: { fullName: string; email: string | null };
  jobOpening: { title: string; location: string | null };
}

async function resolveOffer(
  rawToken: string,
  rawEmail: string,
): Promise<
  | { ok: true; application: ResolvedApplication; state: "pending" | "accepted" | "declined" }
  | { ok: false; error: string }
> {
  const application = await prisma.application.findUnique({
    where: { offerToken: rawToken },
    select: {
      id: true,
      candidateId: true,
      jobOpeningId: true,
      stage: true,
      ctcDetails: true,
      dateOfJoining: true,
      offerTokenExpiresAt: true,
      offerAcceptedAt: true,
      offerDeclinedAt: true,
      offerOtpHash: true,
      offerOtpExpiresAt: true,
      offerOtpAttempts: true,
      candidate: { select: { fullName: true, email: true } },
      jobOpening: { select: { title: true, location: true } },
    },
  });
  if (!application) return { ok: false, error: GENERIC_INVALID };

  const onFile = application.candidate.email?.trim().toLowerCase();
  if (!onFile || onFile !== rawEmail.trim().toLowerCase()) {
    return { ok: false, error: GENERIC_MISMATCH };
  }

  const state = getOfferState(application);
  if (state === "expired") {
    // Lazy expiry: don't wait for the daily sweep.
    if (application.stage === "APPROVED") {
      await expireOfferToShortlist(application.id, "APPROVED");
      revalidatePath(`/job-openings/${application.jobOpeningId}`);
      revalidatePath(`/candidates/${application.candidateId}`);
    }
    return { ok: false, error: GENERIC_EXPIRED };
  }

  return { ok: true, application, state };
}

/**
 * OTP check shared by unlock + respond. Returns an error message or null.
 * Wrong codes count toward a per-code attempt limit; expired/locked codes
 * force the candidate back through "Resend code".
 */
async function checkOtp(
  application: ResolvedApplication,
  otp: string,
): Promise<string | null> {
  if (
    !application.offerOtpHash ||
    !application.offerOtpExpiresAt ||
    application.offerOtpExpiresAt.getTime() < Date.now()
  ) {
    return OTP_EXPIRED;
  }
  if (application.offerOtpAttempts >= OFFER_OTP_MAX_ATTEMPTS) {
    return OTP_LOCKED;
  }
  if (!otpHashMatches(application.offerOtpHash, application.id, otp)) {
    await prisma.application.update({
      where: { id: application.id },
      data: { offerOtpAttempts: { increment: 1 } },
    });
    return application.offerOtpAttempts + 1 >= OFFER_OTP_MAX_ATTEMPTS
      ? OTP_LOCKED
      : OTP_WRONG;
  }
  return null;
}

async function toPayload(
  application: ResolvedApplication,
  state: "pending" | "accepted" | "declined",
): Promise<OfferPayload> {
  return {
    state,
    candidateName: application.candidate.fullName,
    jobTitle: application.jobOpening.title,
    location: application.jobOpening.location,
    ctcDetails: application.ctcDetails,
    dateOfJoining: application.dateOfJoining
      ? application.dateOfJoining.toISOString().slice(0, 10)
      : null,
    agreement: await getOfferAgreement(),
    companyName: await getCompanyName(),
  };
}

/**
 * Gate step 1: email matches → send a 6-digit code to the email on file.
 * Re-requesting replaces the previous code and resets the attempt counter.
 */
export async function requestOfferOtp(input: {
  token: string;
  email: string;
}): Promise<OtpRequestResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_INVALID };

  const resolved = await resolveOffer(parsed.data.token, parsed.data.email);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { application } = resolved;

  // Soft rate limit: one code per minute (requestedAt = expiresAt - TTL).
  if (application.offerOtpExpiresAt) {
    const requestedAt =
      application.offerOtpExpiresAt.getTime() - OFFER_OTP_TTL_MINUTES * 60_000;
    if (Date.now() - requestedAt < 60_000) {
      return {
        ok: false,
        error: "A code was just sent — please wait a minute before requesting another.",
      };
    }
  }

  const otp = generateOfferOtp();
  await prisma.application.update({
    where: { id: application.id },
    data: {
      offerOtpHash: hashOfferOtp(application.id, otp),
      offerOtpExpiresAt: new Date(Date.now() + OFFER_OTP_TTL_MINUTES * 60_000),
      offerOtpAttempts: 0,
    },
  });

  // Like the login OTP, verification codes aren't recorded on the candidate's
  // email thread. In dev the transport logs instead of sending.
  const { subject, html, text } = await offerOtpEmail(otp);
  const result = await sendOtpMail({
    to: application.candidate.email!,
    subject,
    html,
    text,
  });
  if (result.provider === "console") {
    console.log(
      `\n[BoonHRM] (dev) offer OTP for ${application.candidate.fullName}: ${otp}\n`,
    );
  }

  return { ok: true };
}

/** Gate step 2: email + valid code → the offer payload (or terminal state). */
export async function unlockOffer(input: {
  token: string;
  email: string;
  otp: string;
}): Promise<OfferResult> {
  const parsed = unlockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_INVALID };

  const resolved = await resolveOffer(parsed.data.token, parsed.data.email);
  if (!resolved.ok) return resolved;
  const { application, state } = resolved;

  const otpError = await checkOtp(application, parsed.data.otp);
  if (otpError) return { ok: false, error: otpError };

  // Keep the code valid while the candidate reads the offer, so accept/decline
  // (which re-verifies it) doesn't fail mid-review.
  await prisma.application.update({
    where: { id: application.id },
    data: {
      offerOtpExpiresAt: new Date(
        Date.now() + OFFER_OTP_UNLOCKED_MINUTES * 60_000,
      ),
    },
  });

  return { ok: true, offer: await toPayload(application, state) };
}

/** Accept or decline. Idempotent — an already-answered offer returns its state. */
export async function respondToOffer(input: {
  token: string;
  email: string;
  otp: string;
  decision: "accept" | "decline";
}): Promise<OfferResult> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_INVALID };

  const resolved = await resolveOffer(parsed.data.token, parsed.data.email);
  if (!resolved.ok) return resolved;
  const { application, state } = resolved;

  const otpError = await checkOtp(application, parsed.data.otp);
  if (otpError) return { ok: false, error: otpError };

  // Already answered (e.g. double click / second tab) — just report it.
  if (state !== "pending") {
    return { ok: true, offer: await toPayload(application, state) };
  }

  // The response consumes the code.
  const clearOtp = {
    offerOtpHash: null,
    offerOtpExpiresAt: null,
    offerOtpAttempts: 0,
  };

  if (parsed.data.decision === "accept") {
    // Snapshot exactly what the candidate agreed to — the agreement text is
    // admin-editable, so the accepted version must be recorded verbatim.
    const [agreementText, companyName] = await Promise.all([
      getOfferAgreement(),
      getCompanyName(),
    ]);
    await prisma.$transaction([
      prisma.application.update({
        where: { id: application.id },
        data: { offerAcceptedAt: new Date(), ...clearOtp }, // stage stays APPROVED
      }),
      prisma.offerAcceptance.create({
        data: {
          applicationId: application.id,
          jobTitle: application.jobOpening.title,
          companyName,
          candidateName: application.candidate.fullName,
          candidateEmail: parsed.data.email.trim().toLowerCase(),
          location: application.jobOpening.location,
          ctcDetails: application.ctcDetails,
          dateOfJoining: application.dateOfJoining,
          agreementText,
        },
      }),
    ]);
  } else {
    const REASON = "Declined offer via offer page";
    await prisma.$transaction([
      prisma.application.update({
        where: { id: application.id },
        data: {
          stage: "REJECTED",
          stageEnteredAt: new Date(),
          rejectionType: "CANDIDATE_DECLINED",
          rejectionReason: REASON,
          rejectedAt: new Date(),
          approvedAt: null,
          offerDeclinedAt: new Date(),
          ...clearOtp,
        },
      }),
      prisma.applicationStageHistory.create({
        data: {
          applicationId: application.id,
          fromStage: "APPROVED",
          toStage: "REJECTED",
          movedById: null, // candidate action via offer page
          rejectionType: "CANDIDATE_DECLINED",
          rejectionReason: REASON,
        },
      }),
    ]);
  }

  // HR notification is best-effort — the response is already recorded.
  try {
    await notifyOfferResponse(
      {
        fullName: application.candidate.fullName,
        email: application.candidate.email ?? "",
        jobOpening: { title: application.jobOpening.title },
      },
      parsed.data.decision === "accept" ? "accepted" : "declined",
    );
  } catch (error) {
    console.error("Offer response HR notification failed:", error);
  }

  revalidatePath(`/job-openings/${application.jobOpeningId}`);
  revalidatePath(`/candidates/${application.candidateId}`);

  const newState = parsed.data.decision === "accept" ? "accepted" : "declined";
  return { ok: true, offer: await toPayload(application, newState) };
}
