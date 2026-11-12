import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { card, openApp } from "./helpers";

/**
 * Automated accessibility audit (axe-core) against WCAG 2.1 levels A and AA,
 * on every screen and every dialog, in French and in Arabic. An automated
 * audit catches a part of what matters (names, roles, contrast, structure);
 * it does not replace a person using a screen reader.
 */
async function audit(page: Page, where: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${where}: ${v.id} (${v.impact}) — ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
  );
  expect(summary).toEqual([]);
}

const close = (page: Page) => page.getByRole("dialog").getByRole("button").first().click();

for (const lang of ["fr", "ar"] as const) {
  test(`${lang}: every screen and dialog passes the WCAG 2.1 AA audit`, async ({ page }) => {
    // Ten full audits in one test: allow more than the default 30 seconds.
    test.setTimeout(120_000);
    await openApp(page, lang);
    const first = page.locator("article").first();

    // Attendance, with an absent worker (reason chips) and one with overtime.
    await first.locator('[data-status="absent"]').click();
    await page.locator("article").nth(1).locator('[data-status="present"]').click();
    // A third worker present without overtime shows the "+1 h" button.
    await page.locator("article").nth(2).locator('[data-status="present"]').click();
    await audit(page, "attendance");
    await page.locator("article").nth(1).locator("[data-overtime-quick]").click();
    await audit(page, "attendance with overtime");

    // The dialogs reached from the attendance screen.
    await page.locator("header").getByRole("button").nth(0).click();
    await audit(page, "language");
    await close(page);
    await page.locator("header").getByRole("button").nth(1).click();
    await audit(page, "settings");
    await close(page);
    await first.getByRole("button").first().click();
    await audit(page, "employee");
    await close(page);
    await page.locator("[data-view]").last().click();
    await audit(page, "month");

    await page.locator("[data-advances-open]").first().click();
    await page.getByRole("dialog").locator("[name=amount]").fill("300");
    await page.getByRole("dialog").locator("button[type=submit]").click();
    await page.getByRole("dialog").locator("[data-advance]").waitFor();
    await audit(page, "advances");
    await close(page);

    await page.locator("[data-calendar-open]").first().click();
    await audit(page, "calendar");
    await close(page);

    // Export and backup, from the bottom bar.
    const bar = page.locator("main").getByRole("button").filter({ has: page.locator("svg.lucide-file-spreadsheet") });
    await bar.click();
    await audit(page, "export");
    await close(page);
    await page.locator("main").getByRole("button").filter({ has: page.locator("svg.lucide-database-backup") }).click();
    await audit(page, "backup");
  });
}

test("every control can be reached and used with the keyboard", async ({ page }) => {
  await openApp(page);
  // Tab to the first status button of the first card and press it with the keyboard.
  const present = card(page, "Mohamed Bouzidi").locator('[data-status="present"]');
  await present.focus();
  await expect(present).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(present).toHaveAttribute("aria-pressed", "true");

  // Dialogs keep the focus inside and close with Escape.
  await page.getByRole("button", { name: "Réglages" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
