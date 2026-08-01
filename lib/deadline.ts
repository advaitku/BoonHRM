// Closure-deadline countdown shared by the openings list and the opening page.
// Counted in whole calendar days (local time), so a deadline later today reads
// "Due today" rather than "0 days left" and midnight doesn't flip mid-hour.

export type DeadlineUrgency = "passed" | "today" | "soon" | "normal";

export interface DeadlineInfo {
  /** Whole calendar days from today to the deadline; negative once passed. */
  days: number;
  /** "12 days left" / "Due today" / "3 days overdue" */
  label: string;
  urgency: DeadlineUrgency;
}

/** Days from today to `date`, both floored to local midnight. */
export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  );
}

export function deadlineInfo(date: Date | string): DeadlineInfo {
  const days = daysUntil(date);
  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      days,
      label: `${overdue} ${overdue === 1 ? "day" : "days"} overdue`,
      urgency: "passed",
    };
  }
  if (days === 0) return { days, label: "Due today", urgency: "today" };
  return {
    days,
    label: `${days} ${days === 1 ? "day" : "days"} left`,
    // A week out is the point where HR wants the row to stand out.
    urgency: days <= 7 ? "soon" : "normal",
  };
}

export const DEADLINE_URGENCY_CLASS: Record<DeadlineUrgency, string> = {
  passed: "font-medium text-destructive",
  today: "font-medium text-destructive",
  soon: "font-medium text-amber-600 dark:text-amber-500",
  normal: "text-muted-foreground",
};
