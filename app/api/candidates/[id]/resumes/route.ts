import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";
import { extractResume } from "@/lib/resume";
import { MAX_RESUME_BYTES, RESUME_MIME_EXT, saveResume } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

// GET — list this candidate's resumes (metadata only, no file bytes).
export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const resumes = await prisma.resume.findMany({
    where: { candidateId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      mime: true,
      originalName: true,
      extractedText: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ resumes });
}

// POST — add another resume (does not touch any existing ones). Fills any
// still-empty profile fields from this resume, but never overwrites what HR
// already typed or picked up from an earlier resume.
export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!RESUME_MIME_EXT[file.type]) {
    return NextResponse.json(
      { error: "Only PDF or DOCX resumes are supported" },
      { status: 415 },
    );
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: "Resume must be 3 MB or smaller" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractResume(file.type, buffer, file.name);
  const filePath = await saveResume(candidate.id, file.type, buffer);

  const resume = await prisma.resume.create({
    data: {
      candidateId: candidate.id,
      filePath,
      mime: file.type,
      originalName: file.name,
      extractedText: extracted.text || null,
      parsedEmail: extracted.email,
      parsedPhone: extracted.phone,
    },
  });

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      email: candidate.email ?? extracted.email,
      phone: candidate.phone ?? extracted.phone,
      address: candidate.address ?? extracted.address,
      workHistory: candidate.workHistory ?? extracted.workHistory,
      education: candidate.education ?? extracted.education,
    },
  });

  return NextResponse.json({ ok: true, id: resume.id });
}
