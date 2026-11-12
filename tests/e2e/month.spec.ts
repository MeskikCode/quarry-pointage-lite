import { expect, test, type Page } from "@playwright/test";
import { card, openApp, todayISO } from "./helpers";

const monthRow = (page: Page, name: string) => page.locator(`[data-month-row="${name}"]`);

test("shows each employee's days, absences, overtime and pay due for the month", async ({ page }) => {
  const app = await openApp(page);
  const today = todayISO();
  const [year, month] = [today.slice(0, 4), today.slice(5, 7)];

  // Everyone present today; one monthly employee and one daily worker absent.
  await page.locator('[data-action="all-present"]').click();
  await card(page, "Omar Idrissi").locator('[data-status="absent"]').click();
  await card(page, "Brahim Oukacha").locator('[data-status="absent"]').click();
  // Overtime for a monthly driver (25 MAD/h).
  const driver = card(page, "Saïd Ouhammou");
  await driver.getByRole("button", { name: "Ajouter une heure supplémentaire" }).click();
  await driver.getByRole("button", { name: "Ajouter une heure supplémentaire" }).click();

  await page.locator('[data-view="month"]').click();
  await expect(page.getByTestId("current-month")).toHaveText(`${month}/${year}`);

  // Monthly staff: the salary is due even when absent.
  await expect(monthRow(page, "Omar Idrissi").locator("[data-pay]")).toContainText(/5\s500,00/);
  await expect(monthRow(page, "Omar Idrissi")).toContainText("Absences");
  // Monthly with overtime: 4 500 + 2 h x 25.
  await expect(monthRow(page, "Saïd Ouhammou").locator("[data-pay]")).toContainText(/4\s550,00/);
  // Daily and absent: nothing. Daily and present: one day.
  await expect(monthRow(page, "Brahim Oukacha").locator("[data-pay]")).toContainText("0,00");
  await expect(monthRow(page, "Ali Aït Baha").locator("[data-pay]")).toContainText(/100,00/);
  // Total: salaries 47 500 + 50 overtime + 2 daily workers x 100 + 2 guards x 90 = 47 930.
  await expect(page.getByTestId("month-total")).toContainText(/47\s930,00/);

  // A month with no attendance still shows the salaries that are due.
  await page.getByRole("button", { name: "Mois précédent" }).click();
  await expect(page.getByText("Aucun pointage ce mois-ci.")).toBeVisible();
  await expect(page.getByTestId("month-total")).toContainText(/47\s500,00/);
  await expect(monthRow(page, "Ali Aït Baha").locator("[data-pay]")).toContainText("0,00");

  // The export opens on the month being read.
  await page.getByRole("button", { name: "Exporter Excel" }).click();
  const before = new Date(Number(year), Number(month) - 2, 1);
  const previous = `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, "0")}`;
  await expect(page.getByRole("dialog").locator('input[type="month"]')).toHaveValue(previous);
  await page.getByRole("dialog").getByRole("button", { name: "Fermer" }).first().click();

  // Back to attendance: the day is as it was left.
  await page.locator('[data-view="attendance"]').click();
  await expect(card(page, "Omar Idrissi").locator('[data-status="absent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  app.expectNoErrors();
});

test("the month summary follows the language", async ({ page }) => {
  await openApp(page, "ar");
  await page.locator('[data-view="month"]').click();
  await expect(page.getByTestId("current-month")).toBeVisible();
  await expect(page.getByRole("region", { name: "حصيلة الشهر" })).toBeVisible();
  await expect(page.getByTestId("month-total")).toHaveCSS("direction", "ltr");
});
