import { expect, test } from "@playwright/test";
import { card, expectNoSidewaysScroll, openApp } from "./helpers";

const LANGUAGES = [
  { code: "zgh", dir: "ltr", present: "ⵉⵍⵍⴰ", font: "Noto Sans Tifinagh" },
  { code: "ar", dir: "rtl", present: "حاضر", font: "IBM Plex Sans Arabic" },
  { code: "fr", dir: "ltr", present: "Présent", font: "Montserrat" },
  { code: "en", dir: "ltr", present: "Present", font: "Montserrat" },
  { code: "es", dir: "ltr", present: "Presente", font: "Montserrat" },
] as const;

test("offers five languages, in the agreed order, each in its own script", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Langue" }).click();
  const rows = page.getByRole("dialog").locator("[data-lang]");
  await expect(rows).toHaveText(["ⵜⴰⵎⴰⵣⵉⵖⵜ", "العربية", "Français", "English", "Español"]);
});

for (const language of LANGUAGES) {
  test(`${language.code}: translates the screen, sets the direction and loads its font`, async ({ page }) => {
    const app = await openApp(page);
    await page.getByRole("button", { name: "Langue" }).click();
    await page.locator(`[data-lang="${language.code}"]`).click();

    await expect(page.locator("html")).toHaveAttribute("lang", language.code);
    await expect(page.locator("html")).toHaveAttribute("dir", language.dir);

    const present = card(page, "Mohamed Bouzidi").locator('[data-status="present"]');
    await expect(present).toHaveText(language.present);

    // The script's own font is used, not a system fallback.
    await page.evaluate(() => document.fonts.ready);
    const family = await present.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain(language.font);
    const loaded = await page.evaluate(
      ([font, sample]) => document.fonts.check(`16px "${font}"`, sample),
      [language.font, language.present] as const,
    );
    expect(loaded).toBe(true);

    // Numbers and identifiers stay left to right in every language.
    const cin = card(page, "Mohamed Bouzidi").getByText("EE100001");
    await expect(cin).toHaveCSS("direction", "ltr");

    // The choice survives a reload.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", language.code);
    await expect(card(page, "Mohamed Bouzidi").locator('[data-status="present"]')).toHaveText(language.present);

    await expectNoSidewaysScroll(page);
    app.expectNoErrors();
  });
}

test("mirrors the layout in Arabic", async ({ page }) => {
  await openApp(page, "ar");
  const previous = page.getByRole("button", { name: "اليوم السابق" });
  const next = page.getByRole("button", { name: "اليوم التالي" });
  const previousBox = await previous.boundingBox();
  const nextBox = await next.boundingBox();
  // In a right-to-left layout "previous" sits on the right.
  expect(previousBox!.x).toBeGreaterThan(nextBox!.x);
});

for (const width of [320, 360, 768, 1024, 1920]) {
  test(`fits a ${width}px screen in every language`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openApp(page);
    for (const language of LANGUAGES) {
      await page.getByRole("button").filter({ has: page.locator("svg.lucide-globe") }).click();
      await page.locator(`[data-lang="${language.code}"]`).click();
      await expect(page.locator("html")).toHaveAttribute("lang", language.code);

      const worker = page.locator("article").first();
      await worker.locator('[data-status="absent"]').click();
      await expectNoSidewaysScroll(page);

      // No label is clipped inside a button.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll("main button")].filter(
          (button) => button.scrollWidth > button.clientWidth + 1,
        ).length,
      );
      expect(clipped, `${language.code} at ${width}px`).toBe(0);

      await worker.locator('[data-status="absent"]').click();
    }
  });
}
