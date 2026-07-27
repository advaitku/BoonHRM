import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";
import { deleteStoredFile, readStoredFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string; resumeId: string }> };

// GET — stream one resume (inline for PDF so it opens in the browser).
export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, resumeId } = await params;
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.candidateId !== id) {
    return NextResponse.json({ error: "No resume on file" }, { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readStoredFile(resume.filePath);
  } catch {
    return NextResponse.json({ error: "Resume file missing" }, { status: 404 });
  }

  const inline = resume.mime === "application/pdf";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": resume.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(resume.originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// DELETE — remove one resume's file and row.
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, resumeId } = await params;
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.candidateId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteStoredFile(resume.filePath);
  await prisma.resume.delete({ where: { id: resumeId } });

  return NextResponse.json({ ok: true });
}
