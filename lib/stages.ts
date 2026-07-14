import type { Stage } from "@/lib/generated/prisma/enums";

export const PIPELINE_STAGES = ["POOL", "INTERVIEW", "SHORTLIST"] as const;
export const TERMINAL_STAGES = ["APPROVED", "REJECTED"] as const;
export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES] as const;

export const STAGE_LABELS: Record<Stage, string> = {
  POOL: "Pool",
  INTERVIEW: "Interview",
  SHORTLIST: "Shortlist",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

// Tailwind accents used consistently across board columns, badges and cards.
export const STAGE_ACCENTS: Record<
  Stage,
  { dot: string; badge: string; column: string }
> = {
  POOL: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
    column: "border-t-sky-500",
  },
  INTERVIEW: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    column: "border-t-amber-500",
  },
  SHORTLIST: {
    dot: "bg-violet-500",
    badge:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
    column: "border-t-violet-500",
  },
  APPROVED: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    column: "border-t-emerald-500",
  },
  REJECTED: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
    column: "border-t-rose-500",
  },
};
