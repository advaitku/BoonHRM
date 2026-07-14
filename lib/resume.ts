
// Basic resume text extraction (V1): raw text via unpdf (PDF) / mammoth (DOCX)
// plus regex for email/phone and a light name guess. AI parsing is a V2 item.

export interface ExtractedResume {
  text: string;
  email: string | null;
  phone: string | null;
  nameGuess: string | null;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// Permissive international phone: optional +country, 8-14 digits with common separators.
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,6}\b/;

export async function extractResume(
  mime: string,
  data: Buffer,
  originalFilename: string,
): Promise<ExtractedResume> {
  let text = "";
  try {
    if (mime === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(data));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text ?? "";
    } else {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: data });
      text = result.value ?? "";
    }
  } catch (error) {
    // Scanned/image PDFs and corrupt files yield no text — never block creation.
    console.warn("Resume text extraction failed:", error);
  }

  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();

  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = findPhone(text);
  const nameGuess = guessName(text, originalFilename);

  return { text, email, phone, nameGuess };
}

function findPhone(text: string): string | null {
  const match = text.match(PHONE_RE);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  // Reject matches that are too short/long to be a phone number (years, ids).
  if (digits.length < 8 || digits.length > 14) return null;
  return match[0].trim();
}

function guessName(text: string, filename: string): string | null {
  // 1) First non-empty line of the resume, if it looks like a person's name.
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine && looksLikeName(firstLine)) return titleCase(firstLine);

  // 2) Fall back to the filename: "Advait_Shinde-Resume.pdf" -> "Advait Shinde".
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\b(resume|cv|curriculum|vitae|final|updated|latest|\d{4})\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stem && looksLikeName(stem)) return titleCase(stem);

  return null;
}

function looksLikeName(s: string): boolean {
  const words = s.split(/\s+/);
  return (
    words.length >= 1 &&
    words.length <= 4 &&
    /^[A-Za-z][A-Za-z'’. -]*$/.test(s) &&
    s.length <= 60
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
