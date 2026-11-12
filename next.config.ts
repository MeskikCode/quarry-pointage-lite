import type { NextConfig } from "next";
import packageJson from "./package.json" with { type: "json" };

/**
 * The application is exported as static files: there is no server. It can be
 * hosted anywhere that serves a folder, and it is what the service worker
 * precaches for offline use.
 *
 * NEXT_PUBLIC_BASE_PATH is set when the files are served from a sub-folder,
 * for example `/quarry-pointage-lite` on GitHub Pages. It is empty otherwise.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
