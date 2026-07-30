"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
  isUniqueViolation,
  parseCandidateForm,
  type CandidateInput,
} from "@/lib/candidate-schema";

export type DuplicateResolution = "overwrite" | "keep";

export type CreateApplicationResult =
  | { ok: true; candidateId: string; applicationId: string }
  // Same email exists — caller must resubmit with a resolution.
  | { ok: false; kind: "duplicate"; candidateId: string; existingName: string }
  // Person already has an application for this opening (one per opening, ever).
  | { ok: false; kind: "already_applied"; candidateId: string }
  | { ok: false; kind: "error"; error: string };

/**
 * Adds a candidate to an opening. If the email matches an existing person,
 * returns `duplicate` until the caller picks a resolution: `overwrite` updates
 * the profile with the submitted fields, `keep` leaves it untouched — either
 * way a new Application is created for this opening.
 */
export async function createApplication(
  jobOpeningId: string,
  formData: FormData,
  resolution?: DuplicateResolution,
): Promise<CreateApplicationResult> {
  const session = await requireUser();

  const opening = await prisma.jobOpening.findUnique({ where: { id: jobOpeningId } });
  if (!opening) return { ok: false, kind: "error", error: "Job opening not found" };

  const parsed = parseCandidateForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "error",
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const data = parsed.data;

  const existing = data.email
    ? await prisma.candidate.findUnique({ where: { email: data.email } })
    : null;

  try {
    if (!existing) {
      const candidate = await prisma.candidate.create({
        data: {
          ...toPersonFields(data),
          createdById: session.user.id,
          applications: {
            create: applicationCreate(jobOpeningId, session.user.id),
          },
        },
        include: { applications: { where: { jobOpeningId }, select: { id: true } } },
      });
      revalidatePath(`/job-openings/${jobOpeningId}`);
      return {
        ok: true,
        candidateId: candidate.id,
        applicationId: candidate.applications[0].id,
      };
    }

    const applied = await prisma.application.findUnique({
      where: {
        candidateId_jobOpeningId: { candidateId: existing.id, jobOpeningId },
      },
      select: { id: true },
    });
    if (applied) {
      return { ok: false, kind: "already_applied", candidateId: existing.id };
    }

    if (!resolution) {
      return {
        ok: false,
        kind: "duplicate",
        candidateId: existing.id,
        existingName: existing.fullName,
      };
    }

    if (resolution === "overwrite") {
      await prisma.candidate.update({
        where: { id: existing.id },
        data: toPersonFields(data),
      });
    }
    const application = await prisma.application.create({
      data: {
        candidateId: existing.id,
        ...applicationCreate(jobOpeningId, session.user.id),
      },
    });

    revalidatePath(`/job-openings/${jobOpeningId}`);
    revalidatePath(`/candidates/${existing.id}`);
    return { ok: true, candidateId: existing.id, applicationId: application.id };
  } catch (error) {
    // Unique-constraint race: someone created the email or application first.
    if (isUniqueViolation(error)) {
      const raced = data.email
        ? await prisma.candidate.findUnique({ where: { email: data.email } })
        : null;
      if (raced) {
        return { ok: false, kind: "already_applied", candidateId: raced.id };
      }
    }
    throw error;
  }
}

/** Removes one application; the person, resumes, comments and tags remain. */
export async function deleteApplication(
  applicationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { candidateId: true, jobOpeningId: true },
  });
  if (!application) return { ok: false, error: "Application not found" };

  await prisma.application.delete({ where: { id: applicationId } });

  revalidatePath(`/candidates/${application.candidateId}`);
  revalidatePath(`/job-openings/${application.jobOpeningId}`);
  return { ok: true };
}

function toPersonFields(data: CandidateInput) {
  return {
    fullName: data.fullName,
    email: data.email ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    workHistory: data.workHistory ?? null,
    education: data.education ?? null,
  };
}

function applicationCreate(jobOpeningId: string, userId: string) {
  return {
    jobOpeningId,
    createdById: userId,
    stageHistory: { create: { toStage: "POOL" as const, movedById: userId } },
  };
}
