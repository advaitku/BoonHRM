// Sanitization for the rich-text job description — the app's only user-authored
// HTML. Authors are authenticated HR/admin staff, but the output renders on a
// PUBLIC page, so a compromised account is a real XSS vector.
//
// Sanitized on BOTH save and render: save-time keeps the DB clean for any future
// consumer (export, email, API), render-time covers rows written outside the Zod
// pipeline (pre-existing rows, seed scripts, a future second write path).
import sanitizeHtml from "sanitize-html";

/** Exactly what the editor toolbar can emit — nothing more. */
const ALLOWED_TAGS = [
  "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "code",
  "h2", "h3", "h4",
  "ul", "ol", "li",
  "blockquote", "pre",
  "a",
];

// Deliberately excluded, each an attack surface the toolbar cannot produce:
// img (<img onerror>), iframe/embed/object, form/input/button, svg, style,
// script, table, and span/div (Tiptap only emits those with TextStyle, which
// is not configured).
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // No class/style anywhere — prose styling is ours, and inline style is a
  // content-spoofing / clickjacking vector on a public page.
  allowedAttributes: { a: ["href", "title", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  // Drop the *contents* of these rather than leaking them as visible text.
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  transformTags: {
    // Every link leaves the site safely and cannot reach back via window.opener.
    a: sanitizeHtml.simpleTransform("a", {
      rel: "nofollow noopener noreferrer",
      target: "_blank",
    }),
  },
};

/** True when the input contains no HTML markup at all. */
function looksLikePlainText(input: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(input);
}

/**
 * Sanitize editor HTML down to the allowlist above.
 *
 * Legacy plain-text values (pre-migration rows, seed scripts) are escaped and
 * wrapped so the renderer only ever deals with HTML. The escaping reuses
 * sanitize-html with an empty allowlist rather than a second hand-rolled
 * escaper, so there is nothing to drift out of sync with
 * `escapeHtml` in lib/email/templates.ts.
 */
export function sanitizeRichText(input: string): string {
  if (looksLikePlainText(input)) {
    const escaped = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
    return `<p>${escaped.replace(/\r\n?/g, "\n").replace(/\n/g, "<br />")}</p>`;
  }
  return sanitizeHtml(input, OPTIONS);
}

/**
 * True when the document has no visible content.
 *
 * Required, not polish: Tiptap's `getHTML()` returns "<p></p>" for an empty
 * document, never "". Without this the description column would never be NULL
 * again and every "no description yet" empty state would be unreachable.
 */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

/** Strip to plain text for meta descriptions / previews. */
export function richTextToPlainText(html: string, maxLength?: number): string {
  // Space between adjacent tags so "<h2>Role</h2><p>Own…" doesn't collapse
  // into "RoleOwn…" once the tags are stripped.
  const text = sanitizeHtml(html.replace(/></g, "> <"), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
