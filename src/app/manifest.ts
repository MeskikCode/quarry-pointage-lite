import type { MetadataRoute } from "next";
import { BASE_PATH, asset } from "@/lib/env";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pointage Carrière",
    short_name: "Pointage",
    description:
      "Offline-first attendance for quarry supervisors. One tap per worker, monthly Excel export.",
    id: `${BASE_PATH}/`,
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "any",
    lang: "fr",
    dir: "auto",
    // Field ink, from the design system.
    background_color: "#050A14",
    theme_color: "#050A14",
    categories: ["business", "productivity"],
    icons: [
      { src: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: asset("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
