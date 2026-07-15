
// Rule-based resume extraction (no AI): rebuilds real text lines from the PDF
// (pdf.js text items carry x/y positions; joining them naively loses line
// breaks, which is why name/address/section parsing used to fail), then parses
// lines with labeled-field and section-header heuristics shared with DOCX.

export interface ExtractedResume {
  text: string;
  email: string | null;
  phone: string | null;
  nameGuess: string | null;
  address: string | null;
  workHistory: string | null;
  education: string | null;
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
      text = await extractPdfLines(data);
    } else {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: data });
      text = result.value ?? "";
    }
  } catch (error) {
    // Scanned/image PDFs and corrupt files yield no text — never block creation.
    console.warn("Resume text extraction failed:", error);
  }

  text = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = text.split("\n").map((l) => l.trim());
  const sections = splitSections(lines);

  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = findPhone(lines, text);
  const nameGuess = guessName(lines, originalFilename);
  const address = findAddress(lines, sections);
  const workHistory = sectionExcerpt(sections, "experience", 2, 2000);
  const education = sectionExcerpt(sections, "education", 2, 1500);

  return { text, email, phone, nameGuess, address, workHistory, education };
}

// ---------------------------------------------------------------------------
// PDF line reconstruction
// ---------------------------------------------------------------------------

interface PdfTextItem {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
}

/**
 * Rebuild visual lines from pdf.js text items by grouping on the Y coordinate
 * (transform[5]) and ordering by X (transform[4]). unpdf's plain extractText
 * merges everything into one line, which breaks all line-based heuristics.
 */
async function extractPdfLines(data: Buffer): Promise<string> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(data));

  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group items into lines by Y with a small tolerance for baseline jitter.
    const rows: { y: number; items: { x: number; str: string }[] }[] = [];
    for (const raw of content.items as PdfTextItem[]) {
      const str = raw.str ?? "";
      if (!str.trim() || !raw.transform) continue;
      const x = raw.transform[4];
      const y = raw.transform[5];
      const row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
      if (row) {
        row.items.push({ x, str });
        row.y = (row.y + y) / 2;
      } else {
        rows.push({ y, items: [{ x, str }] });
      }
    }

    // PDF Y grows upward: top of the page first.
    rows.sort((a, b) => b.y - a.y);
    const lines = rows.map((r) =>
      r.items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n");
}

// ---------------------------------------------------------------------------
// Section segmentation
// ---------------------------------------------------------------------------

type SectionKind =
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "summary"
  | "personal"
  | "other";

const SECTION_HEADERS: [SectionKind, RegExp][] = [
  [
    "experience",
    /^(work|professional|employment|career|relevant)?\s*(experience|history|employment)\s*$|^internships?\s*$/i,
  ],
  [
    "education",
    /^(education(al)?|academics?)(\s+(background|qualifications?|details))?\s*$|^(academic|educational)\s+(background|qualifications?)\s*$|^qualifications?\s*$/i,
  ],
  ["skills", /^((technical|key|core|soft)\s+)?(skills?|competencies)\s*$|^technologies\s*$/i],
  ["projects", /^(key\s+)?projects?\s*$/i],
  ["summary", /^(professional\s+)?(summary|objective|profile|about( me)?)\s*$/i],
  ["personal", /^(personal\s+(details|information|profile)|contact(\s+(details|information))?)\s*$/i],
  [
    "other",
    /^(certifications?|achievements?|awards?|languages?|hobbies|interests|references?|declaration|strengths?|activities|publications?|trainings?|courses?)\s*$/i,
  ],
];

interface Section {
  kind: SectionKind;
  header: string;
  lines: string[];
}

function headerKind(line: string): SectionKind | null {
  const clean = line.replace(/[:\-–—_|•]+\s*$/, "").trim();
  if (!clean || clean.length > 40 || clean.split(/\s+/).length > 4) return null;
  for (const [kind, re] of SECTION_HEADERS) {
    if (re.test(clean)) return kind;
  }
  return null;
}

function splitSections(lines: string[]): Section[] {
  const sections: Section[] = [{ kind: "other", header: "", lines: [] }];
  for (const line of lines) {
    const kind = headerKind(line);
    if (kind) {
      sections.push({ kind, header: line, lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }
  return sections;
}

/** First `maxBlocks` blank-line-separated blocks of a section, size-capped. */
function sectionExcerpt(
  sections: Section[],
  kind: SectionKind,
  maxBlocks: number,
  maxChars: number,
): string | null {
  const section = sections.find((s) => s.kind === kind && s.lines.some((l) => l));
  if (!section) return null;

  const body = section.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body) return null;

  const blocks = body.split(/\n\s*\n/);
  let excerpt =
    blocks.length > 1 ? blocks.slice(0, maxBlocks).join("\n\n") : body;
  // No blank-line structure: keep it readable rather than dumping everything.
  if (blocks.length === 1) {
    excerpt = excerpt.split("\n").slice(0, 14).join("\n");
  }
  if (excerpt.length > maxChars) excerpt = excerpt.slice(0, maxChars).trimEnd() + "…";
  return excerpt;
}

// ---------------------------------------------------------------------------
// Field heuristics
// ---------------------------------------------------------------------------

function labeledValue(lines: string[], label: RegExp): string | null {
  for (const line of lines) {
    const m = line.match(label);
    if (m) {
      const value = line.slice(m.index! + m[0].length).trim();
      if (value) return value;
    }
  }
  return null;
}

function findPhone(lines: string[], text: string): string | null {
  const labeled = labeledValue(lines, /^(phone|mobile|contact(\s+no\.?)?|tel|ph)\s*[:\-–]\s*/i);
  const source = labeled ?? text;
  const match = source.match(PHONE_RE);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  // Reject matches that are too short/long to be a phone number (years, PINs, ids).
  if (digits.length < 8 || digits.length > 14) return null;
  return match[0].trim();
}

// Role words that make a top-of-resume line a job title, not a person's name.
const ROLE_WORDS =
  /\b(engineer|developer|accountant|manager|analyst|designer|consultant|executive|officer|specialist|architect|scientist|administrator|assistant|associate|intern|lead|head|director|senior|junior|freelancer?|resume|curriculum|vitae|cv|profile)\b/i;

function guessName(lines: string[], filename: string): string | null {
  // 1) Labeled field ("Name: Priya Sharma").
  const labeled = labeledValue(lines, /^(full\s+)?name\s*[:\-–]\s*/i);
  if (labeled && looksLikeName(labeled)) return titleCase(labeled);

  // 2) First plausible line near the top (names often lead the document,
  //    sometimes in ALL CAPS). Skip contact lines, headings and role titles.
  for (const line of lines.slice(0, 8)) {
    if (!line) continue;
    if (EMAIL_RE.test(line) || /https?:\/\/|linkedin|github/i.test(line)) continue;
    if (/\d/.test(line)) continue;
    if (ROLE_WORDS.test(line)) continue;
    if (looksLikeName(line)) return titleCase(line);
  }

  // 3) Fall back to the filename: "Priya_Sharma-Resume.pdf" -> "Priya Sharma".
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\b(resume|cv|curriculum|vitae|final|updated|latest|\d{2,4})\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stem && looksLikeName(stem)) return titleCase(stem);

  return null;
}

function looksLikeName(s: string): boolean {
  const words = s.split(/\s+/);
  return (
    words.length >= 2 &&
    words.length <= 5 &&
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

function findAddress(lines: string[], sections: Section[]): string | null {
  // 1) Labeled field — capture the rest of the line plus up to 2 continuation
  //    lines (stop at blank lines, other labels, or section headers).
  const label = /^((current|permanent|residential|postal)\s+)?(address|location)\s*[:\-–]\s*/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(label);
    if (!m) continue;
    const parts: string[] = [];
    const first = lines[i].slice(m.index! + m[0].length).trim();
    if (first) parts.push(first);
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      const next = lines[j];
      if (!next || headerKind(next) || /^[a-z ]{2,20}[:\-–]/i.test(next)) break;
      parts.push(next);
    }
    const value = parts.join(", ").replace(/\s+/g, " ").trim();
    if (value.length >= 8) return value.slice(0, 300);
  }

  // 2) PIN/ZIP heuristic — an address-looking line with a postal code, checked
  //    in the personal/contact section first, then the top/bottom of the page.
  const pinLine = (pool: string[]) =>
    pool.find(
      (l) =>
        /\b\d{6}\b|\b\d{5}(-\d{4})?\b/.test(l) &&
        /[A-Za-z]{3,}/.test(l) &&
        (l.includes(",") || /\b(road|rd|street|st|nagar|colony|lane|sector|block|apartment|apt|flat|house|dist|city|india)\b/i.test(l)) &&
        !EMAIL_RE.test(l),
    );

  const personal = sections.find((s) => s.kind === "personal");
  const candidatePools = [
    personal?.lines ?? [],
    lines.slice(0, 15),
    lines.slice(-10),
  ];
  for (const pool of candidatePools) {
    const hit = pinLine(pool);
    if (hit) return hit.slice(0, 300);
  }
  return null;
}
