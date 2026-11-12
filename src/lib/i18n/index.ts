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

/** Language tags devices use for Berber languages; all are shown in Tamazight. */
export const BERBER_TAGS = ["zgh", "ber", "tzm", "shi", "rif", "kab"];

/**
 * Language for a first visit: the first device language that the
 * application speaks, otherwise French. Berber language tags vary between
 * devices, so the common ones all map to Tamazight.
 */
export function detectLanguage(preferred: readonly string[]): LanguageCode {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (BERBER_TAGS.includes(base)) return "zgh";
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Runs in the page's <head>, before anything is painted. The page is
 * prerendered in French; when the device will use another language, this sets
 * the language and direction at once and marks the page as pending, which
 * hides the content (see globals.css) until the right language is on screen.
 * French, the default, is shown immediately. Same rules as `detectLanguage`.
 */
export const LANGUAGE_BOOT_SCRIPT = `(function(){try{
var codes=${JSON.stringify(LANGUAGES.map((l) => l.code))},berber=${JSON.stringify(BERBER_TAGS)},l=null;
try{l=localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)})}catch(e){}
if(codes.indexOf(l)<0){l=${JSON.stringify(DEFAULT_LANGUAGE)};var p=navigator.languages||[navigator.language||""];
for(var i=0;i<p.length;i++){var b=String(p[i]).toLowerCase().split("-")[0];
if(berber.indexOf(b)>=0){l="zgh";break}if(codes.indexOf(b)>=0){l=b;break}}}
if(l!==${JSON.stringify(DEFAULT_LANGUAGE)}){var d=document.documentElement;d.lang=l;d.dir=l==="ar"?"rtl":"ltr";d.setAttribute("data-lang-pending","")}
}catch(e){}})();`;
