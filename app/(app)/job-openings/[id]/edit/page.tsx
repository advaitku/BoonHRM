import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { JobOpeningForm } from "@/components/job-openings/job-opening-form";

export default async function EditJobOpeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const opening = await prisma.jobOpening.findUnique({ where: { id } });
  if (!opening) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit opening</h1>
        <p className="text-muted-foreground">{opening.title}</p>
      </div>
      <JobOpeningForm
        openingId={opening.id}
        initial={{
          title: opening.title,
          description: opening.description ?? "",
          location: opening.location ?? "",
          positions: opening.positions,
          status: opening.status,
          onlineInterviewUrl: opening.onlineInterviewUrl ?? "",
          inPersonInterviewUrl: opening.inPersonInterviewUrl ?? "",
          autoNotify: opening.autoNotify,
        }}
      />
    </div>
  );
}
