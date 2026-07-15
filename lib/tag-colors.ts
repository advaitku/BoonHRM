// Tag color palette — a key is assigned when a tag is first created and stays
// stable. Rendered as subtle tinted chips consistent in light/dark mode.

export const TAG_PALETTE: Record<string, { chip: string; dot: string }> = {
  teal: {
    chip: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-900",
    dot: "bg-teal-600",
  },
  blue: {
    chip: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-900",
    dot: "bg-sky-600",
  },
  violet: {
    chip: "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-900",
    dot: "bg-violet-600",
  },
  amber: {
    chip: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
    dot: "bg-amber-600",
  },
  rose: {
    chip: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900",
    dot: "bg-rose-600",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
    dot: "bg-emerald-600",
  },
  slate: {
    chip: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
    dot: "bg-slate-500",
  },
};

const KEYS = Object.keys(TAG_PALETTE);

/** Stable palette key derived from the tag name. */
export function pickTagColor(name: string): string {
  let hash = 0;
  for (const ch of name.toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return KEYS[Math.abs(hash) % KEYS.length];
}

export function tagChipClass(color: string): string {
  return (TAG_PALETTE[color] ?? TAG_PALETTE.slate).chip;
}
