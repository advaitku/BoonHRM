import Image from "next/image";
import {
  CalendarClock,
  CalendarDays,
  Hash,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { BOON_CONTACT } from "@/lib/brand";
import { formatJobRef } from "@/lib/job-ref";
import { JobDescription } from "@/components/job-openings/job-description";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * The public job posting card. Server component; deliberately free of anything
 * route-specific so a future /jobs careers index (Phase 2) can reuse it.
 */
export interface JobPostingData {
  refNumber: number;
  title: string;
  description: string | null;
  location: string | null;
  positions: number;
  status: "OPEN" | "CLOSED";
  publishedAt: Date;
  closureDeadline: Date | null;
}

export function JobPosting({
  posting,
  companyName,
  applyEmail,
}: {
  posting: JobPostingData;
  companyName: string;
  applyEmail: string;
}) {
  const closed = posting.status === "CLOSED";
  const ref = formatJobRef(posting.refNumber);
  const applyHref = `mailto:${applyEmail}?subject=${encodeURIComponent(
    `Application — ${posting.title} (${ref})`,
  )}`;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Image
            src="/Boon_Logo.png"
            alt={companyName}
            width={64}
            height={54}
            priority
          />
          <span className="font-heading text-lg font-semibold tracking-tight">
            {companyName}
          </span>
        </div>

        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {closed ? "Position closed" : "We're hiring"}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="font-heading text-2xl">{posting.title}</CardTitle>
          {closed && <Badge variant="secondary">Closed</Badge>}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs">
            <Hash className="size-3.5" />
            {ref}
          </span>
          {posting.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {posting.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {posting.positions} {posting.positions === 1 ? "position" : "positions"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Posted {dateFmt.format(posting.publishedAt)}
          </span>
          {!closed && posting.closureDeadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              Apply by {dateFmt.format(posting.closureDeadline)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {closed && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            This role is no longer accepting applications. Visit{" "}
            <a
              href={BOON_CONTACT.website}
              className="font-medium text-foreground hover:underline"
              rel="noopener noreferrer"
            >
              {BOON_CONTACT.websiteLabel}
            </a>{" "}
            to see our current openings.
          </div>
        )}

        {posting.description ? (
          <JobDescription html={posting.description} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Reach out to us for the full role details.
          </p>
        )}

        {!closed && (
          <div className="space-y-2">
            <Button asChild size="lg">
              <a href={applyHref}>
                <Mail className="size-4" />
                Apply for this role
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Applications by email — please attach your resume and mention{" "}
              <span className="font-mono">{ref}</span> in the subject.
            </p>
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2.5">
            <Image src="/Boon_Logo.png" alt="" width={48} height={40} />
            <p className="text-sm text-muted-foreground">
              Questions about this role? Write to{" "}
              <a
                href={`mailto:${applyEmail}`}
                className="font-medium text-foreground hover:underline"
              >
                {applyEmail}
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a
              href={BOON_CONTACT.website}
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {BOON_CONTACT.websiteLabel}
            </a>
            <span>{BOON_CONTACT.phone}</span>
            <span>
              © {new Date().getFullYear()} {companyName}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
