import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";
import { extractResume } from "@/lib/resume";
import { MAX_RESUME_BYTES, RESUME_MIME_EXT, saveResume } from "@/lib/storage";

// POST /api/candidates — create a candidate from an uploaded resume.
// multipart/form-data: jobOpeningId, file, fullName? (overrides the guess)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const jobOpeningId = String(form.get("jobOpeningId") ?? "");
  const fullNameInput = String(form.get("fullName") ?? "").trim();
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
      { error: "Resume must be 10 MB or smaller" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractResume(file.type, buffer, file.name);

  const fullName =
    fullNameInput || extracted.nameGuess || file.name.replace(/\.[^.]+$/, "");

  const candidate = await prisma.candidate.create({
    data: {
      jobOpeningId,
      fullName,
      email: extracted.email,
      phone: extracted.phone,
      address: extracted.address,
      workHistory: extracted.workHistory,
      education: extracted.education,
      createdById: session.user.id,
      stageHistory: {
        create: { toStage: "POOL", movedById: session.user.id },
      },
    },
  });

  const resumeFilePath = await saveResume(candidate.id, file.type, buffer);
  await prisma.resume.create({
    data: {
      candidateId: candidate.id,
      filePath: resumeFilePath,
      mime: file.type,
      originalName: file.name,
      extractedText: extracted.text || null,
      parsedEmail: extracted.email,
      parsedPhone: extracted.phone,
    },
  });

  return NextResponse.json({
    id: candidate.id,
    fullName,
    email: extracted.email,
    phone: extracted.phone,
    address: extracted.address,
    workHistory: Boolean(extracted.workHistory),
    education: Boolean(extracted.education),
    extractedChars: extracted.text.length,
  });
}
