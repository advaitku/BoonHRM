import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const opening = await prisma.jobOpening.findFirst({
    where: { title: "Senior Accountant" },
  });
  if (!opening) throw new Error("Run after creating the Senior Accountant opening");

  const demo = [
    { fullName: "Rahul Verma", email: "rahul.verma@example.com", phone: "+91 90000 11111", stage: "POOL" },
    { fullName: "Anita Desai", email: "anita.desai@example.com", phone: "+91 90000 22222", stage: "POOL" },
    { fullName: "Suresh Iyer", email: "suresh.iyer@example.com", phone: "+91 90000 33333", stage: "INTERVIEW" },
    { fullName: "Meera Nair", email: "meera.nair@example.com", phone: "+91 90000 44444", stage: "SHORTLIST" },
    { fullName: "Vikram Singh", email: "vikram.singh@example.com", phone: "+91 90000 55555", stage: "REJECTED" },
  ] as const;

  for (const d of demo) {
    // One person per email; one application per (person, opening).
    const candidate = await prisma.candidate.upsert({
      where: { email: d.email },
      update: {},
      create: { fullName: d.fullName, email: d.email, phone: d.phone },
    });
    const applied = await prisma.application.findUnique({
      where: {
        candidateId_jobOpeningId: {
          candidateId: candidate.id,
          jobOpeningId: opening.id,
        },
      },
    });
    if (applied) continue;
    await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobOpeningId: opening.id,
        stage: d.stage,
        ...(d.stage === "REJECTED"
          ? { rejectionType: "COMPANY_REJECTED", rejectedAt: new Date() }
          : {}),
        stageHistory: { create: { toStage: d.stage } },
      },
    });
  }
  console.log("Demo candidates seeded for", opening.title, "->", opening.id);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
