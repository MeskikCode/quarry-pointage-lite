/** Path prefix when the application is served from a sub-folder, for example
 * `/quarry-pointage-lite` on GitHub Pages. Empty at the root of a domain. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/** Prefix a public file with the base path. */
export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Field ink, the ground colour of the design system's field theme
 * (--field-ink). Repeated here for the web manifest and the browser chrome,
 * which cannot read a CSS variable. */
export const FIELD_INK = "#050A14";
