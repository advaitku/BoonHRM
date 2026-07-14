import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME || "Admin";
  if (!email) throw new Error("SEED_ADMIN_EMAIL is not set");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({ where: { email }, data: { role: "admin" } });
      console.log(`Promoted existing user ${email} to admin.`);
    } else {
      console.log(`Admin ${email} already exists — nothing to do.`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      name,
      emailVerified: true,
      role: "admin",
    },
  });
  console.log(`Seeded first admin: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
