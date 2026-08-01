// Public job posting — /jobs/BOON-014. No session, no middleware (the matcher
// only protects internal prefixes; /jobs is deliberately outside /job-openings).
//
// Confidentiality invariant: an UNPUBLISHED opening must be byte-identical to a
// ref that was never issued — same 404, same body, no title/metadata leak.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCompanyName, getSupportEmail } from "@/lib/settings";
import { BOON_CONTACT } from "@/lib/brand";
import { formatJobRef, jobUrl, parseJobRef } from "@/lib/job-ref";
import { richTextToPlainText } from "@/lib/rich-text";
import { JobPosting } from "@/components/jobs/job-posting";

export const dynamic = "force-dynamic";

// Deduped across generateMetadata + the page render (one query per request).
// Narrow select — internal fields (assignee, interview URLs, applications)
// must never be within reach of a public serializer.
const loadPosting = cache(async (refNumber: number) => {
  const opening = await prisma.jobOpening.findUnique({
    where: { refNumber },
    select: {
      refNumber: true,
      title: true,
      description: true,
      location: true,
      positions: true,
      status: true,
      publishedAt: true,
      closureDeadline: true,
    },
  });
  // Unpublished ≡ nonexistent, everywhere downstream.
  if (!opening?.publishedAt) return null;
  return opening;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  const refNumber = parseJobRef(decodeURIComponent(ref));
  const posting = refNumber ? await loadPosting(refNumber) : null;
  if (!posting) {
    return { title: "Role not available", robots: { index: false, follow: false } };
  }

  const companyName = await getCompanyName();
  const title = `${posting.title} — ${companyName}`;
  const description = posting.description
    ? richTextToPlainText(posting.description, 160)
    : `${posting.title} at ${companyName}. View the role and apply.`;
  const url = jobUrl(posting.refNumber);

  return {
    title,
    description,
    alternates: { canonical: url },
    // Closed roles stay reachable for anyone holding the link, but unindexed.
    robots:
      posting.status === "OPEN"
        ? { index: true, follow: true }
        : { index: false, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: companyName,
      images: [{ url: "/Boon_Logo.png", width: 305, height: 258 }],
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const decoded = decodeURIComponent(ref);
  const refNumber = parseJobRef(decoded);
  if (!refNumber) notFound();

  const posting = await loadPosting(refNumber);
  if (!posting) notFound();

  // parseJobRef is tolerant (boon-14, BOON-0014, 14) — serve one canonical URL.
  const canonical = formatJobRef(refNumber);
  if (decoded !== canonical) redirect(`/jobs/${canonical}`);

  const [companyName, supportEmail] = await Promise.all([
    getCompanyName(),
    getSupportEmail(),
  ]);

  return (
    <JobPosting
      posting={{
        refNumber: posting.refNumber,
        title: posting.title,
        description: posting.description,
        location: posting.location,
        positions: posting.positions,
        status: posting.status,
        publishedAt: posting.publishedAt!,
        closureDeadline: posting.closureDeadline,
      }}
      companyName={companyName}
      applyEmail={supportEmail || BOON_CONTACT.email}
    />
  );
}
