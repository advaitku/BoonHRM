import { requireUser } from "@/lib/auth-helpers";
import { JobOpeningForm } from "@/components/job-openings/job-opening-form";

export default async function NewJobOpeningPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New job opening</h1>
        <p className="text-muted-foreground">
          Once created, the opening gets its own candidate board.
        </p>
      </div>
      <JobOpeningForm />
    </div>
  );
}
