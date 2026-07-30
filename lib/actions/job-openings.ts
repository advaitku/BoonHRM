"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const jobOpeningSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(10_000).optional()),
  location: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
  positions: z.coerce.number().int().min(1, "At least 1 position").max(999),
  status: z.enum(["OPEN", "CLOSED"]),
  onlineInterviewUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("Online interview URL must be a valid URL").optional(),
  ),
  inPersonInterviewUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("In-person interview URL must be a valid URL").optional(),
  ),
  autoNotify: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  closureDeadline: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid closure deadline").optional(),
  ),
  interviewDeadline: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid interview deadline").optional(),
  ),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseForm(formData: FormData) {
  return jobOpeningSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    positions: formData.get("positions"),
    status: formData.get("status"),
    onlineInterviewUrl: formData.get("onlineInterviewUrl"),
    inPersonInterviewUrl: formData.get("inPersonInterviewUrl"),
    autoNotify: formData.get("autoNotify"),
    closureDeadline: formData.get("closureDeadline"),
    interviewDeadline: formData.get("interviewDeadline"),
  });
}

function toDateOrNull(dateOnly: string | undefined): Date | null {
  return dateOnly ? new Date(`${dateOnly}T00:00:00Z`) : null;
}

export async function createJobOpening(formData: FormData): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const opening = await prisma.jobOpening.create({
    data: {
      ...parsed.data,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      onlineInterviewUrl: parsed.data.onlineInterviewUrl ?? null,
      inPersonInterviewUrl: parsed.data.inPersonInterviewUrl ?? null,
      closureDeadline: toDateOrNull(parsed.data.closureDeadline),
      interviewDeadline: toDateOrNull(parsed.data.interviewDeadline),
      createdById: session.user.id,
    },
  });

  revalidatePath("/job-openings");
  return { ok: true, id: opening.id };
}

export async function updateJobOpening(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.jobOpening.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Job opening not found" };

  await prisma.jobOpening.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      onlineInterviewUrl: parsed.data.onlineInterviewUrl ?? null,
      inPersonInterviewUrl: parsed.data.inPersonInterviewUrl ?? null,
      closureDeadline: toDateOrNull(parsed.data.closureDeadline),
      interviewDeadline: toDateOrNull(parsed.data.interviewDeadline),
    },
  });

  revalidatePath("/job-openings");
  revalidatePath(`/job-openings/${id}`);
  return { ok: true, id };
}

export async function setJobOpeningStatus(
  id: string,
  status: "OPEN" | "CLOSED",
): Promise<ActionResult> {
  await requireUser();
  await prisma.jobOpening.update({ where: { id }, data: { status } });
  revalidatePath("/job-openings");
  revalidatePath(`/job-openings/${id}`);
  return { ok: true, id };
}

export async function setJobOpeningAssignee(
  id: string,
  userId: string | null,
): Promise<ActionResult> {
  await requireUser();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { ok: false, error: "User not found" };
  }
  await prisma.jobOpening.update({ where: { id }, data: { assignedToId: userId } });
  revalidatePath("/job-openings");
  revalidatePath(`/job-openings/${id}`);
  return { ok: true, id };
}

export async function deleteJobOpening(id: string): Promise<ActionResult> {
  await requireUser();
  const candidateCount = await prisma.candidate.count({ where: { jobOpeningId: id } });
  if (candidateCount > 0) {
    return {
      ok: false,
      error: `This opening has ${candidateCount} candidate(s). Close it instead of deleting.`,
    };
  }
  await prisma.jobOpening.delete({ where: { id } });
  revalidatePath("/job-openings");
  redirect("/job-openings");
}
