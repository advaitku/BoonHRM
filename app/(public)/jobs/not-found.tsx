// Branded 404 for /jobs/* — served identically for unknown refs and
// unpublished (confidential) openings, so the two are indistinguishable.
import { BOON_CONTACT } from "@/lib/brand";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JobNotFound() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="font-heading text-xl">Role not available</CardTitle>
        <CardDescription>
          This job posting isn&apos;t available. It may have been filled or
          removed. Visit{" "}
          <a
            href={BOON_CONTACT.website}
            className="font-medium text-foreground hover:underline"
            rel="noopener noreferrer"
          >
            {BOON_CONTACT.websiteLabel}
          </a>{" "}
          to see our current openings.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
