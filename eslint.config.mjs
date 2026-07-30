import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      // Verification builds go to a separate dist dir (see CLAUDE.md); it's a
      // build artifact, not source — don't lint it.
      ".next-build/**",
      "out/**",
      "build/**",
      "lib/generated/**",
      "next-env.d.ts",
    ],
  },
  {
    // Passenger/Plesk CommonJS entry point — must use require(), runs as CJS.
    files: ["server.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
