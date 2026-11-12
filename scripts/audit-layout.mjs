/**
 * Layout audit: opens the built application at a range of screen widths, in
 * every language, and reports anything that scrolls sideways or clips.
 *
 *   npm run build && npm run preview     (in one terminal)
 *   node scripts/audit-layout.mjs        (in another)
 *
 * The end-to-end tests assert the same conditions; this script exists to
 * name the offending element when one of them fails.
 */
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL ?? "http://localhost:4173/";
const WIDTHS = [320, 360, 375, 414, 480, 600, 768, 900, 1024, 1280, 1440, 1920];
const LANGUAGES = ["zgh", "ar", "fr", "en", "es"];

const browser = await chromium.launch();
let problems = 0;

for (const width of WIDTHS) {
  for (const lang of LANGUAGES) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript((code) => window.localStorage.setItem("qp_lang", code), lang);
    await page.goto(URL);
    await page.locator("article").first().waitFor();
    // Open the widest state of a card: absent, with its reason chips.
    await page.locator("article").first().locator('[data-status="absent"]').click();
    await page.locator("article").nth(1).locator('[data-status="present"]').click();
    await page.evaluate(() => document.fonts.ready);

    const inspect = () =>
      page.evaluate(() => {
      const root = document.documentElement;
      const describe = (el) =>
        `${el.tagName.toLowerCase()}${el.dataset.status ? `[status=${el.dataset.status}]` : ""}` +
        `${el.dataset.team ? `[team=${el.dataset.team}]` : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
      const issues = [];
      const sideways = root.scrollWidth - root.clientWidth;
      if (sideways > 0) {
        const wide = [...document.querySelectorAll("body *")].filter((el) => {
          const box = el.getBoundingClientRect();
          return box.right > root.clientWidth + 1 || box.left < -1;
        });
        // Report the innermost offenders only. The team scroller is allowed to extend.
        const inner = wide.filter((el) => !wide.some((other) => other !== el && el.contains(other)));
        issues.push(`page scrolls sideways by ${sideways}px: ${inner.slice(0, 4).map(describe).join(" | ")}`);
      }
      for (const button of document.querySelectorAll("button")) {
        if (button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1) {
          issues.push(`clipped: ${describe(button)} (${button.scrollWidth}>${button.clientWidth})`);
        }
      }
      return issues;
      });
    const found = await inspect();
    await page.locator("[data-view=month]").click();
    await page.getByTestId("month-total").waitFor();
    for (const issue of await inspect()) found.push(`[month] ${issue}`);

    for (const issue of found) {
      problems += 1;
      console.log(`${String(width).padStart(4)}px ${lang.padEnd(3)} ${issue}`);
    }
    await context.close();
  }
}

await browser.close();
console.log(problems === 0 ? "audit-layout  no problem found" : `audit-layout  ${problems} problem(s)`);
process.exit(problems === 0 ? 0 : 1);
