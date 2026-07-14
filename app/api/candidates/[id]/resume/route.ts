import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";
import { extractResume } from "@/lib/resume";
import {
  MAX_RESUME_BYTES,
  RESUME_MIME_EXT,
  deleteStoredFile,
  readStoredFile,
  saveResume,
} from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

// GET — stream the resume (inline for PDF so it opens in the browser).
export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate?.resumeFilePath) {
    return NextResponse.json({ error: "No resume on file" }, { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readStoredFile(candidate.resumeFilePath);
  } catch {
    return NextResponse.json({ error: "Resume file missing" }, { status: 404 });
  }

  const filename = candidate.resumeOriginalName ?? "resume";
  const inline = candidate.resumeMime === "application/pdf";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": candidate.resumeMime ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// PUT — replace the resume and re-run extraction (keeps profile fields;
// only refreshes parsed*/extracted text and fills email/phone if empty).
export async function PUT(request: Request, { params }: Params) {
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
    return NextResponse.json({ error: "Resume must be 10 MB or smaller" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractResume(file.type, buffer, file.name);

  if (candidate.resumeFilePath) await deleteStoredFile(candidate.resumeFilePath);
  const resumeFilePath = await saveResume(candidate.id, file.type, buffer);

  await prisma.candidate.update({
    where: { id },
    data: {
      resumeFilePath,
      resumeMime: file.type,
      resumeOriginalName: file.name,
      extractedResumeText: extracted.text || null,
      parsedEmail: extracted.email,
      parsedPhone: extracted.phone,
      email: candidate.email ?? extracted.email,
      phone: candidate.phone ?? extracted.phone,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — remove the resume file and clear resume fields.
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (candidate.resumeFilePath) await deleteStoredFile(candidate.resumeFilePath);
  await prisma.candidate.update({
    where: { id },
    data: {
      resumeFilePath: null,
      resumeMime: null,
      resumeOriginalName: null,
      extractedResumeText: null,
      parsedEmail: null,
      parsedPhone: null,
    },
  });

  return NextResponse.json({ ok: true });
}
