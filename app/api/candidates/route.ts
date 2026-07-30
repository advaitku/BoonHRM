import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";
import { extractResume } from "@/lib/resume";
import { MAX_RESUME_BYTES, RESUME_MIME_EXT, saveResume } from "@/lib/storage";
import { isUniqueViolation } from "@/lib/candidate-schema";

// POST /api/candidates — create a candidate + application from an uploaded resume.
// multipart/form-data: jobOpeningId, file, fullName? (overrides the guess),
// resolution? ("overwrite" | "keep" — how to handle a duplicate-email match).
//
// Responses (200):
//  { status: "created", id, applicationId, ... }        — new person + application
//  { status: "duplicate", candidateId, candidateName }  — email already on file;
//        nothing written — re-POST the same file with a resolution to proceed
//  { status: "already_applied", candidateId, candidateName } — that person
//        already has an application for this opening (one per opening, ever)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const jobOpeningId = String(form.get("jobOpeningId") ?? "");
  const fullNameInput = String(form.get("fullName") ?? "").trim();
  const resolutionInput = String(form.get("resolution") ?? "");
  const resolution =
    resolutionInput === "overwrite" || resolutionInput === "keep"
      ? resolutionInput
      : null;
  const file = form.get("file");

  if (!jobOpeningId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "jobOpeningId and file are required" },
      { status: 400 },
    );
  }

  const opening = await prisma.jobOpening.findUnique({ where: { id: jobOpeningId } });
  if (!opening) {
    return NextResponse.json({ error: "Job opening not found" }, { status: 404 });
  }

  if (!RESUME_MIME_EXT[file.type]) {
    return NextResponse.json(
      { error: "Only PDF or DOCX resumes are supported" },
      { status: 415 },
    );
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json(
      { error: "Resume must be 3 MB or smaller" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractResume(file.type, buffer, file.name);
  const email = extracted.email?.trim().toLowerCase() || null;

  const fullName =
    fullNameInput || extracted.nameGuess || file.name.replace(/\.[^.]+$/, "");

  const existing = email
    ? await prisma.candidate.findUnique({ where: { email } })
    : null;

  try {
    let candidateId: string;
    let applicationId: string;

    if (!existing) {
      const candidate = await prisma.candidate.create({
        data: {
          fullName,
          email,
          phone: extracted.phone,
          address: extracted.address,
          workHistory: extracted.workHistory,
          education: extracted.education,
          createdById: session.user.id,
          applications: {
            create: {
              jobOpeningId,
              createdById: session.user.id,
              stageHistory: {
                create: { toStage: "POOL", movedById: session.user.id },
              },
            },
          },
        },
        include: {
          applications: { where: { jobOpeningId }, select: { id: true } },
        },
      });
      candidateId = candidate.id;
      applicationId = candidate.applications[0].id;
    } else {
      const applied = await prisma.application.findUnique({
        where: {
          candidateId_jobOpeningId: { candidateId: existing.id, jobOpeningId },
        },
        select: { id: true },
      });
      if (applied) {
        return NextResponse.json({
          status: "already_applied",
          candidateId: existing.id,
          candidateName: existing.fullName,
        });
      }
      if (!resolution) {
        return NextResponse.json({
          status: "duplicate",
          candidateId: existing.id,
          candidateName: existing.fullName,
        });
      }

      if (resolution === "overwrite") {
        // Overwrite with what this resume provided; keep fields it didn't.
        await prisma.candidate.update({
          where: { id: existing.id },
          data: {
            fullName,
            phone: extracted.phone ?? existing.phone,
            address: extracted.address ?? existing.address,
            workHistory: extracted.workHistory ?? existing.workHistory,
            education: extracted.education ?? existing.education,
          },
        });
      }
      const application = await prisma.application.create({
        data: {
          candidateId: existing.id,
          jobOpeningId,
          createdById: session.user.id,
          stageHistory: {
            create: { toStage: "POOL", movedById: session.user.id },
          },
        },
      });
      candidateId = existing.id;
      applicationId = application.id;
    }

    const resumeFilePath = await saveResume(candidateId, file.type, buffer);
    await prisma.resume.create({
      data: {
        candidateId,
        filePath: resumeFilePath,
        mime: file.type,
        originalName: file.name,
        extractedText: extracted.text || null,
        parsedEmail: email,
        parsedPhone: extracted.phone,
      },
    });

    return NextResponse.json({
      status: "created",
      id: candidateId,
      applicationId,
      fullName,
      email,
      phone: extracted.phone,
      address: extracted.address,
      workHistory: Boolean(extracted.workHistory),
      education: Boolean(extracted.education),
      extractedChars: extracted.text.length,
    });
  } catch (error) {
    // Unique-constraint race (parallel upload of the same person): report it
    // as already applied so the client shows the existing-candidate link.
    if (isUniqueViolation(error) && email) {
      const raced = await prisma.candidate.findUnique({ where: { email } });
      if (raced) {
        return NextResponse.json({
          status: "already_applied",
          candidateId: raced.id,
          candidateName: raced.fullName,
        });
      }
    }
    throw error;
  }
}
