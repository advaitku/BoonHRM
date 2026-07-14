import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 uses a driver adapter (pure-JS mariadb driver) instead of the Rust
// query engine — lighter and more reliable to deploy on Plesk/Passenger.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma(): PrismaClient {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
