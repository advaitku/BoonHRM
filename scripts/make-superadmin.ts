import "dotenv/config";
import { prisma } from "../lib/prisma";

// Promote an existing user to the platform-operator "superadmin" role — the
// only role allowed into /command-center. Deliberately not assignable from the
// app UI. Usage:
//   npx tsx scripts/make-superadmin.ts you@example.com
// or via the npm script (works from Plesk's "Run script" with arguments):
//   npm run superadmin -- you@example.com

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npx tsx scripts/make-superadmin.ts <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `No user with email ${email} — create them in Settings → Users first.`,
    );
  }
  if (user.role === "superadmin") {
    console.log(`${email} is already a super admin — nothing to do.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: "superadmin" },
  });
  console.log(`Promoted ${email} (was "${user.role}") to super admin.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
