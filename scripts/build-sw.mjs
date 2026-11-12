/**
 * Builds the service worker for the static export.
 *
 *   npm run build     runs `next build`, then this script
 *
 * Why a script: the export names its assets with content hashes, so the
 * precache list can only be written after the build, from the files that are
 * actually in `out/`. The worker itself (src/sw.ts) is bundled here with the
 * list inlined, and written to `out/sw.js`.
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "out");
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Never precached: the worker cannot update a cached copy of itself, and
 * source maps are of no use on a supervisor's phone. */
const SKIP = (name) => name === "sw.js" || name.endsWith(".map") || name === ".nojekyll";

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return SKIP(entry.name) ? [] : [full];
  });
}

let files;
try {
  files = walk(OUT);
} catch {
  console.error("build-sw  no out/ folder. Run `next build` first.");
  process.exit(1);
}

if (!files.some((file) => relative(OUT, file) === "index.html")) {
  console.error("build-sw  out/index.html is missing. The export did not complete.");
  process.exit(1);
}

let bytes = 0;
const entries = files.map((file) => {
  const content = readFileSync(file);
  bytes += statSync(file).size;
  const path = relative(OUT, file).split(sep).join(posix.sep);
  // The start page is requested as the folder URL, not as index.html.
  const url = path === "index.html" ? `${BASE_PATH}/` : `${BASE_PATH}/${path}`;
  return { url, revision: createHash("sha256").update(content).digest("hex").slice(0, 16) };
});

await build({
  entryPoints: [join(ROOT, "src", "sw.ts")],
  outfile: join(OUT, "sw.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  define: {
    __SW_MANIFEST: JSON.stringify(entries),
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "warning",
});

console.log(
  `build-sw  ${entries.length} files precached, ${Math.round(bytes / 1024)} KB` +
    (BASE_PATH ? `, base path ${BASE_PATH}` : ""),
);
