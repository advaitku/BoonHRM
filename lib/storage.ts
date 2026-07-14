import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Private file storage — OUTSIDE the web root in production (set
// PRIVATE_STORAGE_DIR to an absolute path in the Plesk env). Files are only
// ever served through authenticated route handlers, never by URL.

function storageRoot(): string {
  const dir = process.env.PRIVATE_STORAGE_DIR || "./.storage";
  return path.resolve(dir);
}

export const RESUME_MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10 MB

/** Persist a resume buffer; returns the path RELATIVE to the storage root. */
export async function saveResume(
  candidateKey: string,
  mime: string,
  data: Buffer,
): Promise<string> {
  const ext = RESUME_MIME_EXT[mime];
  if (!ext) throw new Error(`Unsupported resume type: ${mime}`);
  // Always store with forward slashes so paths stay portable across OSes.
  const rel = `resumes/${candidateKey}/${randomUUID()}.${ext}`;
  const abs = path.join(storageRoot(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return rel;
}

export async function readStoredFile(relPath: string): Promise<Buffer> {
  return readFile(resolveStored(relPath));
}

export async function deleteStoredFile(relPath: string): Promise<void> {
  try {
    await rm(resolveStored(relPath));
  } catch {
    // Already gone — fine.
  }
}

/** Resolve a stored relative path, refusing anything that escapes the root. */
function resolveStored(relPath: string): string {
  const abs = path.resolve(storageRoot(), relPath);
  if (!abs.startsWith(storageRoot() + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return abs;
}
