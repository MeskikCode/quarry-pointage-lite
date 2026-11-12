/**
 * Takes the README screenshots from the built application.
 *
 *   npm run build && npm run preview     (in one terminal)
 *   node scripts/screenshots.mjs         (in another)
 *
 * Every image comes from the running application with its sample crew;
 * nothing is mocked up.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.env.AUDIT_URL ?? "http://localhost:4173/";
const OUT = join(import.meta.dirname, "..", "docs", "screenshots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/** Open the application in one language and mark a believable shift. */
async function open(options, lang) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.addInitScript((code) => window.localStorage.setItem("qp_lang", code), lang);
  await page.goto(URL);
  await page.locator("article").first().waitFor();
  const cards = page.locator("article");
  // The way a real day goes: one tap for the whole crew, then the exceptions.
  await page.locator('[data-action="all-present"]').click();
  await page.getByTestId("bulk-done").waitFor();
  await cards.nth(2).locator('[data-status="late"]').click();
  await cards.nth(4).locator('[data-status="half_day"]').click();
  await cards.nth(6).locator('[data-status="absent"]').click();
  await cards.nth(6).locator('[data-reason="maladie"]').click();
  await cards.nth(9).locator('[data-status="absent"]').click();
  // Two hours of overtime for the first driver.
  await cards.nth(5).locator("[data-overtime-quick]").click();
  await cards.nth(5).locator("[data-overtime] + button").click();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  return { context, page };
}


/** In the month view: two advances for the first employee, then close the dialog. */
async function addSampleAdvances(page, shot) {
  await page.locator("[data-advances-open]").first().click();
  const dialog = page.getByRole("dialog");
  const samples = [["1000", "Réparation voiture"], ["500", ""]];
  for (const [index, [amount, note]] of samples.entries()) {
    await dialog.locator("[name=amount]").fill(amount);
    await dialog.locator("[name=note]").fill(note);
    await dialog.locator("button[type=submit]").click();
    // Wait for the advance to be listed before typing the next one.
    await dialog.locator("[data-advance]").nth(index).waitFor();
  }
  if (shot) await page.screenshot({ path: shot });
  await dialog.locator("footer button").click();
  await dialog.waitFor({ state: "hidden" });
}

const phone = { ...devices["Pixel 7"] };

for (const lang of ["fr", "ar", "zgh", "en", "es"]) {
  const { context, page } = await open(phone, lang);
  await page.screenshot({ path: join(OUT, `phone-${lang}.png`) });
  await context.close();
}

{
  const { context, page } = await open(phone, "fr");
  await page.locator("article").nth(6).scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "phone-absence.png") });
  await page.getByRole("button", { name: "Nouvel employé" }).click();
  await page.getByRole("dialog").locator('[name="fullName"]').fill("Ali Pompiste");
  await page.screenshot({ path: join(OUT, "phone-employee.png") });
  await context.close();
}

{
  const { context, page } = await open(phone, "fr");
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("dialog").locator("[name=siteName]").fill("Carrière Oued Tensift");
  await page.getByRole("dialog").locator("form button[type=submit]").click();
  await page.getByRole("dialog").getByText("Nom enregistré.").waitFor();
  await page.screenshot({ path: join(OUT, "phone-settings.png") });
  await context.close();
}

{
  const { context, page } = await open(phone, "fr");
  await page.getByRole("button", { name: "Langue" }).click();
  await page.screenshot({ path: join(OUT, "phone-languages.png") });
  await context.close();
}

{
  const { context, page } = await open(phone, "fr");
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.getByText("Mode hors ligne").waitFor();
  await page.screenshot({ path: join(OUT, "phone-offline.png") });
  await context.close();
}

{
  const { context, page } = await open(phone, "fr");
  await page.locator('[data-view="month"]').click();
  await page.getByTestId("month-total").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await addSampleAdvances(page, join(OUT, "phone-advances.png"));
  await page.screenshot({ path: join(OUT, "phone-month.png") });
  // One employee's month, day by day.
  await page.locator("[data-calendar-open]").first().click();
  await page.getByRole("dialog").getByTestId("calendar").waitFor();
  await page.screenshot({ path: join(OUT, "phone-calendar.png") });
  await page.getByRole("dialog").locator("footer button").click();
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 }, "fr");
  await page.locator('[data-view="month"]').click();
  await page.getByTestId("month-total").waitFor();
  await addSampleAdvances(page);
  await page.screenshot({ path: join(OUT, "desktop-month.png") });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 }, "fr");
  await page.screenshot({ path: join(OUT, "tablet-fr.png") });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 }, "fr");
  await page.screenshot({ path: join(OUT, "desktop-fr.png") });
  await context.close();
}

await browser.close();
console.log(`screenshots  written to ${OUT}`);
