// Shared candidate profile validation — used by the manual-entry server action
// and the resume-upload route. Not a "use server" file, so plain exports are fine.
import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

export const candidateSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(160),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Valid email required").optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  workHistory: z.preprocess(emptyToUndefined, z.string().trim().max(8000).optional()),
  education: z.preprocess(emptyToUndefined, z.string().trim().max(8000).optional()),
});

export type CandidateInput = z.infer<typeof candidateSchema>;

export function parseCandidateForm(formData: FormData) {
  return candidateSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    workHistory: formData.get("workHistory"),
    education: formData.get("education"),
  });
}

/** Prisma unique-constraint violation (race-safe duplicate detection). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}
