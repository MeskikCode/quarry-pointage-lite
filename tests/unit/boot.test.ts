import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { LANGUAGE_BOOT_SCRIPT, detectLanguage, type LanguageCode } from "@/lib/i18n";

/** Run the boot script against a fake page, as a browser would before painting. */
function boot(saved: string | null, languages: string[], storageThrows = false) {
  const attributes = new Map<string, string>();
  const documentElement = {
    lang: "fr",
    dir: "ltr",
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  };
  runInNewContext(LANGUAGE_BOOT_SCRIPT, {
    document: { documentElement },
    navigator: { languages, language: languages[0] ?? "" },
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error("blocked");
        return saved;
      },
    },
  });
  return { lang: documentElement.lang, dir: documentElement.dir, pending: attributes.has("data-lang-pending") };
}

describe("the language boot script", () => {
  it("leaves a French page alone, so it is shown at once", () => {
    expect(boot(null, ["fr-MA"])).toEqual({ lang: "fr", dir: "ltr", pending: false });
    expect(boot("fr", ["ar-MA"])).toEqual({ lang: "fr", dir: "ltr", pending: false });
    expect(boot(null, ["de-DE"])).toEqual({ lang: "fr", dir: "ltr", pending: false });
  });

  it("applies a saved language and direction before the first paint", () => {
    expect(boot("ar", ["fr"])).toEqual({ lang: "ar", dir: "rtl", pending: true });
    expect(boot("zgh", [])).toEqual({ lang: "zgh", dir: "ltr", pending: true });
  });

  it("ignores a saved value that is not a language of the application", () => {
    expect(boot("it", ["fr"])).toEqual({ lang: "fr", dir: "ltr", pending: false });
  });

  it("still works when storage is blocked", () => {
    expect(boot(null, ["es-ES"], true)).toEqual({ lang: "es", dir: "ltr", pending: true });
  });

  it.each([
    [["en-GB"]],
    [["es-ES", "en"]],
    [["ar-MA"]],
    [["tzm-Latn-MA"]],
    [["shi"]],
    [["de-DE", "en-GB"]],
    [["de-DE"]],
    [[]],
  ])("chooses the same language as the application for %j", (languages) => {
    const expected: LanguageCode = detectLanguage(languages);
    expect(boot(null, languages).lang).toBe(expected);
  });
});
