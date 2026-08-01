// Public-facing Boon contact details, shown in the footer of candidate-facing
// pages (offer page, public job posting).
//
// Lives here rather than inside a component so BOTH client components
// (components/offer/offer-flow.tsx) and server components
// (components/jobs/job-posting.tsx) can import it. Hardcoded for the same
// reason as JOB_REF_PREFIX — it is brand identity, not operational config.
export const BOON_CONTACT = {
  website: "https://helloboon.com",
  websiteLabel: "helloboon.com",
  email: "hr@helloboon.com",
  phone: "+91 92893 45544",
} as const;
