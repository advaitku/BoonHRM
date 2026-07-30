"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export type ActionResult = { ok: true } | { ok: false; error: string };

const bodySchema = z.string().trim().min(1, "Comment can't be empty").max(5000);

export async function addComment(
  candidateId: string,
  body: string,
): Promise<ActionResult> {
  const session = await requireUser();

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { applications: { select: { jobOpeningId: true } } },
  });
  if (!candidate) return { ok: false, error: "Candidate not found" };

  await prisma.candidateComment.create({
    data: { candidateId, authorId: session.user.id, body: parsed.data },
  });

  revalidatePath(`/candidates/${candidateId}`);
  for (const application of candidate.applications) {
    revalidatePath(`/job-openings/${application.jobOpeningId}`);
  }
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const session = await requireUser();

  const comment = await prisma.candidateComment.findUnique({
    where: { id: commentId },
    include: {
      candidate: {
        select: { id: true, applications: { select: { jobOpeningId: true } } },
      },
    },
  });
  if (!comment) return { ok: false, error: "Comment not found" };

  const isOwn = comment.authorId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwn && !isAdmin) {
    return { ok: false, error: "You can only delete your own comments" };
  }

  await prisma.candidateComment.delete({ where: { id: commentId } });

  revalidatePath(`/candidates/${comment.candidate.id}`);
  for (const application of comment.candidate.applications) {
    revalidatePath(`/job-openings/${application.jobOpeningId}`);
  }
  return { ok: true };
}
