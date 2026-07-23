import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 uses a driver adapter (pure-JS mariadb driver) instead of the Rust
// query engine — lighter and more reliable to deploy on Plesk/Passenger.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Guard so a misconfigured runtime fails with a clear message instead of an
    // opaque driver crash ("Cannot read properties of undefined").
    throw new Error("DATABASE_URL is not set — the database is required at runtime.");
  }
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

function getPrisma(): PrismaClient {
  return (globalForPrisma.prisma ??= createPrisma());
}

// Lazily construct the client on first use. `next build` imports every route
// module to collect page data, and the build environment has no DATABASE_URL —
// constructing the mariadb pool eagerly at import time would crash the build.
// The Proxy defers construction until a query actually runs (only at runtime),
// while keeping `prisma.model.method(...)` call sites unchanged.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
