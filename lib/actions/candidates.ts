"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { deleteStoredFile } from "@/lib/storage";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const candidateSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(160),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Valid email required").optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  workHistory: z.preprocess(emptyToUndefined, z.string().trim().max(8000).optional()),
  education: z.preprocess(emptyToUndefined, z.string().trim().max(8000).optional()),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseCandidate(formData: FormData) {
  return candidateSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    workHistory: formData.get("workHistory"),
    education: formData.get("education"),
  });
}

export async function createCandidate(
  jobOpeningId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();

  const opening = await prisma.jobOpening.findUnique({ where: { id: jobOpeningId } });
  if (!opening) return { ok: false, error: "Job opening not found" };

  const parsed = parseCandidate(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const candidate = await prisma.candidate.create({
    data: {
      jobOpeningId,
      fullName: parsed.data.fullName,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      workHistory: parsed.data.workHistory ?? null,
      education: parsed.data.education ?? null,
      createdById: session.user.id,
      stageHistory: {
        create: { toStage: "POOL", movedById: session.user.id },
      },
    },
  });

  revalidatePath(`/job-openings/${jobOpeningId}`);
  return { ok: true, id: candidate.id };
}

export async function updateCandidate(
  candidateId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  const parsed = parseCandidate(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

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

  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath(`/job-openings/${candidate.jobOpeningId}`);
  return { ok: true, id: candidateId };
}

export async function deleteCandidate(candidateId: string): Promise<ActionResult> {
  await requireUser();

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  if (candidate.resumeFilePath) {
    await deleteStoredFile(candidate.resumeFilePath);
  }
  await prisma.candidate.delete({ where: { id: candidateId } });

  revalidatePath(`/job-openings/${candidate.jobOpeningId}`);
  redirect(`/job-openings/${candidate.jobOpeningId}`);
}
