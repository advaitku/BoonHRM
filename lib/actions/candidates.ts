"use server";

// Person-level candidate actions. Creating a candidate happens through
// createApplication (lib/actions/applications.ts), which owns duplicate-email
// detection and the one-application-per-opening rule.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { deleteStoredFile } from "@/lib/storage";
import { isUniqueViolation, parseCandidateForm } from "@/lib/candidate-schema";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function updateCandidate(
  candidateId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { applications: { select: { jobOpeningId: true } } },
  });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  const parsed = parseCandidateForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        workHistory: parsed.data.workHistory ?? null,
        education: parsed.data.education ?? null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Another candidate already uses this email" };
    }
    throw error;
  }

  revalidatePath(`/candidates/${candidateId}`);
  for (const application of candidate.applications) {
    revalidatePath(`/job-openings/${application.jobOpeningId}`);
  }
  return { ok: true, id: candidateId };
}

/** Deletes the person entirely — all applications cascade away with them. */
export async function deleteCandidate(candidateId: string): Promise<ActionResult> {
  await requireUser();

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      resumes: { select: { filePath: true } },
      applications: { select: { jobOpeningId: true } },
    },
  });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  for (const resume of candidate.resumes) {
    await deleteStoredFile(resume.filePath);
  }
  await prisma.candidate.delete({ where: { id: candidateId } });

  for (const application of candidate.applications) {
    revalidatePath(`/job-openings/${application.jobOpeningId}`);
  }
  redirect(`/job-openings`);
}
