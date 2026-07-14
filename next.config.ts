import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the production server self-contained for Plesk (Linux).
  // Skipped on Windows where copying files named like `node:buffer` fails (`:` is
  // illegal in Windows paths); local dev uses `next dev` / `server.js` anyway.
  output: process.platform === "win32" ? undefined : "standalone",
  // The generated Prisma client and the mariadb driver are server-only packages;
  // keep them external to the bundle so they load from node_modules at runtime.
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
};

export default nextConfig;
