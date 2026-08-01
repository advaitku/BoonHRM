import { sanitizeRichText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Renders a job opening's rich-text description. Server component — sanitize-html
 * is Node-only, and sanitizing here (as well as on save) covers rows written
 * outside the Zod pipeline.
 *
 * Shared by the internal detail page and the public job posting.
 */
export function JobDescription({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // max-w-none is required — `prose` clamps to 65ch, which leaves a
        // ragged narrow column inside the cards this renders in.
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-heading prose-headings:tracking-tight",
        "prose-a:text-primary prose-a:underline-offset-2",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
