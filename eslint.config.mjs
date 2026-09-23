import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare/OpenNext build output (see wrangler.jsonc, open-next.config.ts) —
    // not part of eslint-config-next's own defaults, so it must be listed here too
    // or a plain `npm run lint` fails on generated code after a Cloudflare build
    // (Codex, GitHub issue #1).
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
