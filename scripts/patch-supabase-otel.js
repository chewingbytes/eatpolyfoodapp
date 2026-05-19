/**
 * Patches @supabase/supabase-js to remove the OpenTelemetry dynamic import
 * that uses webpack magic comments (/* webpackIgnore: true *\/).
 * Hermes cannot parse that syntax, causing EAS iOS builds to fail.
 *
 * This script is run automatically via the "postinstall" npm script.
 */
const fs = require("fs");
const path = require("path");

const filesToPatch = [
  "node_modules/@supabase/supabase-js/dist/index.cjs",
  "node_modules/@supabase/supabase-js/dist/index.mjs",
];

// Matches the entire import() call that loads @opentelemetry/api dynamically.
// Example in source:
//   import(
//     /* webpackIgnore: true */
//     /* @vite-ignore */
//     OTEL_PKG
//   ).catch(() => null)
const OTEL_IMPORT_RE =
  /import\s*\(\s*\/\*\s*webpackIgnore[^)]*\)\s*\.catch\s*\(\s*\(\s*\)\s*=>\s*null\s*\)/gs;

const REPLACEMENT = "Promise.resolve(null)";

let patchedCount = 0;

for (const relPath of filesToPatch) {
  const filePath = path.resolve(__dirname, "..", relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`[patch-supabase-otel] Skipped (not found): ${relPath}`);
    continue;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const patched = original.replace(OTEL_IMPORT_RE, REPLACEMENT);

  if (patched === original) {
    console.log(`[patch-supabase-otel] Already clean (no match): ${relPath}`);
    continue;
  }

  fs.writeFileSync(filePath, patched, "utf8");
  patchedCount++;
  console.log(`[patch-supabase-otel] Patched: ${relPath}`);
}

if (patchedCount === 0) {
  console.log("[patch-supabase-otel] Nothing to patch.");
} else {
  console.log(`[patch-supabase-otel] Done — patched ${patchedCount} file(s).`);
}
