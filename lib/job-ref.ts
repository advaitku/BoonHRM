// Human-readable job opening references (BOON-014) — the code HR quotes on a
// call and the segment of the public URL at /jobs/BOON-014.
//
// Deliberately NOT `server-only`: the pure formatters are used by client
// components and tsx scripts too (same rationale as lib/offer.ts).

/**
 * Brand prefix for opening references. Hardcoded on purpose, not an AppSetting:
 * the prefix is baked into every public URL that has been shared or indexed, so
 * making it runtime-mutable would silently create dead links and force the
 * parser to accept an unbounded set of historical prefixes. Consistent with the
 * other hardcoded brand constants (see lib/brand.ts, /Boon_Logo.png).
 */
export const JOB_REF_PREFIX = "BOON";

/** Minimum digits — a wider number is never truncated. */
const JOB_REF_PAD = 3;

/** 14 -> "BOON-014". 1234 -> "BOON-1234". */
export function formatJobRef(refNumber: number): string {
  return `${JOB_REF_PREFIX}-${String(refNumber).padStart(JOB_REF_PAD, "0")}`;
}

/**
 * "BOON-014" | "boon-14" | "BOON 14" | "014" | "14" -> 14. Anything else -> null.
 * Case-insensitive and padding-tolerant so shared links survive being retyped;
 * the page canonicalizes to `formatJobRef` with a redirect.
 * Rejects 0 — AUTO_INCREMENT starts at 1.
 */
export function parseJobRef(raw: string): number | null {
  const match = /^\s*(?:boon)?[\s._-]*0*(\d{1,9})\s*$/i.exec(raw);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Absolute public URL for an opening. Mirrors `offerUrl` in lib/offer.ts.
 *
 * SERVER ONLY. `APP_URL` is not `NEXT_PUBLIC_`-prefixed, so Next inlines it as
 * `undefined` in client bundles and this would silently produce localhost links
 * in production. Call it in a server component / action and pass the resulting
 * string down as a prop.
 */
export function jobUrl(refNumber: number): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/jobs/${formatJobRef(refNumber)}`;
}
