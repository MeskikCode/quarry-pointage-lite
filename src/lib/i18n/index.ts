import { ar } from "./ar";
import { en } from "./en";
import { es } from "./es";
import { fr, type Dictionary } from "./fr";
import { zgh } from "./zgh";

export type { Dictionary };

/** Listed in the order the application presents them. */
export const LANGUAGES = [
  { code: "zgh", name: "ⵜⴰⵎⴰⵣⵉⵖⵜ", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "en", name: "English", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "fr";
export const LANGUAGE_STORAGE_KEY = "qp_lang";

export const dictionaries: Record<LanguageCode, Dictionary> = { zgh, ar, fr, en, es };

export function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}

export function directionOf(code: LanguageCode): "ltr" | "rtl" {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? "ltr";
}

/**
 * Language for a first visit: the first device language that the
 * application speaks, otherwise French. Berber language tags vary between
 * devices, so the common ones all map to Tamazight.
 */
export function detectLanguage(preferred: readonly string[]): LanguageCode {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (["zgh", "ber", "tzm", "shi", "rif", "kab"].includes(base)) return "zgh";
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
