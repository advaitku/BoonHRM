"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { pickTagColor } from "@/lib/tag-colors";

export type ActionResult = { ok: true } | { ok: false; error: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(40, "Tags are 40 characters max")
  .transform((s) => s.replace(/\s+/g, " "));

export async function addTagToCandidate(
  candidateId: string,
  rawName: string,
): Promise<ActionResult> {
  await requireUser();

  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tag" };
  }
  const name = parsed.data;

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  // Tag names are case-insensitively unique (utf8mb4_unicode_ci) — reuse the
  // existing tag (keeping its original casing/color) or create a new one.
  const tag =
    (await prisma.tag.findFirst({ where: { name } })) ??
    (await prisma.tag.create({ data: { name, color: pickTagColor(name) } }));

  await prisma.candidateTag.upsert({
    where: { candidateId_tagId: { candidateId, tagId: tag.id } },
    create: { candidateId, tagId: tag.id },
    update: {},
  });

  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath(`/job-openings/${candidate.jobOpeningId}`);
  return { ok: true };
}

export async function removeTagFromCandidate(
  candidateId: string,
  tagId: string,
): Promise<ActionResult> {
  await requireUser();

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  await prisma.candidateTag.deleteMany({ where: { candidateId, tagId } });

  // Garbage-collect tags no candidate uses anymore, so suggestions stay clean.
  const stillUsed = await prisma.candidateTag.count({ where: { tagId } });
  if (stillUsed === 0) {
    await prisma.tag.delete({ where: { id: tagId } }).catch(() => {});
  }

  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath(`/job-openings/${candidate.jobOpeningId}`);
  return { ok: true };
}
