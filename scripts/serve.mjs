/**
 * Serves the static export in `out/`, as a plain file host would.
 *
 *   npm run preview                 http://localhost:4173/
 *   NEXT_PUBLIC_BASE_PATH=/quarry-pointage-lite npm run preview
 *                                   http://localhost:4173/quarry-pointage-lite/
 *
 * No dependency: this is what GitHub Pages does, in sixty lines. It is used
 * for manual checks and by the end-to-end tests.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const OUT = join(import.meta.dirname, "..", "out");
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

if (!existsSync(join(OUT, "index.html"))) {
  console.error("serve  no out/index.html. Run `npm run build` first.");
  process.exit(1);
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);

  if (BASE_PATH) {
    if (path === BASE_PATH) {
      response.writeHead(308, { Location: `${BASE_PATH}/` }).end();
      return;
    }
    if (!path.startsWith(`${BASE_PATH}/`)) {
      response.writeHead(404).end("Not found");
      return;
    }
    path = path.slice(BASE_PATH.length);
  }

  let file = normalize(join(OUT, path));
  if (file !== OUT && !file.startsWith(OUT + sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    // The worker and the pages must always be revalidated; hashed assets may be kept.
    "Cache-Control": file.includes(`${sep}_next${sep}static${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`serve  http://localhost:${PORT}${BASE_PATH}/`);
});
