import { expect, test } from "@playwright/test";
import { card, count, expectNoSidewaysScroll, openApp } from "./helpers";

test("marks attendance with one tap and keeps it after a reload", async ({ page }) => {
  const app = await openApp(page);

  await expect(count(page, "unmarked")).toHaveText("15");

  const chief = card(page, "Mohamed Bouzidi");
  await chief.locator('[data-status="present"]').click();
  await expect(chief.locator('[data-status="present"]')).toHaveAttribute("aria-pressed", "true");

  const hand = card(page, "Brahim Oukacha");
  await hand.locator('[data-status="absent"]').click();
  await expect(hand.locator('[data-reason="non_justifie"]')).toHaveAttribute("aria-pressed", "true");
  await hand.locator('[data-reason="maladie"]').click();
  await expect(hand.locator('[data-reason="maladie"]')).toHaveAttribute("aria-pressed", "true");

  await card(page, "Omar Idrissi").locator('[data-status="late"]').click();
  await card(page, "Khalid Benali").locator('[data-status="half_day"]').click();

  await expect(count(page, "present")).toHaveText("3");
  await expect(count(page, "absent")).toHaveText("1");
  await expect(count(page, "unmarked")).toHaveText("11");

  await page.reload();
  await expect(card(page, "Mohamed Bouzidi").locator('[data-status="present"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(card(page, "Brahim Oukacha").locator('[data-reason="maladie"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(count(page, "unmarked")).toHaveText("11");

  await expectNoSidewaysScroll(page);
  app.expectNoErrors();
});

test("clears a status on a second tap", async ({ page }) => {
  await openApp(page);
  const worker = card(page, "Saïd Ouhammou");
  await worker.locator('[data-status="present"]').click();
  await expect(count(page, "present")).toHaveText("1");
  await worker.locator('[data-status="present"]').click();
  await expect(worker.locator('[data-status="present"]')).toHaveAttribute("aria-pressed", "false");
  await expect(count(page, "present")).toHaveText("0");
});

test("counts overtime hours and hides the stepper for an absent worker", async ({ page }) => {
  await openApp(page);
  const worker = card(page, "Hassan Aït Lahcen");
  await expect(worker.locator("[data-overtime]")).toHaveCount(0);

  await worker.locator('[data-status="present"]').click();
  const add = worker.getByRole("button", { name: "Ajouter une heure supplémentaire" });
  const remove = worker.getByRole("button", { name: "Retirer une heure supplémentaire" });
  await expect(remove).toBeDisabled();
  await add.click();
  await add.click();
  await expect(worker.locator("[data-overtime]")).toContainText("2");
  await remove.click();
  await expect(worker.locator("[data-overtime]")).toContainText("1");

  await worker.locator('[data-status="absent"]').click();
  await expect(worker.locator("[data-overtime]")).toHaveCount(0);
});

test("keeps the day and night shifts and each date separate", async ({ page }) => {
  await openApp(page);
  const guard = card(page, "Mbark Aït Ali");
  await guard.locator('[data-status="present"]').click();

  await page.locator('[data-shift="nuit"]').click();
  await expect(guard.locator('[data-status="present"]')).toHaveAttribute("aria-pressed", "false");
  await guard.locator('[data-status="late"]').click();

  await page.locator('[data-shift="jour"]').click();
  await expect(guard.locator('[data-status="present"]')).toHaveAttribute("aria-pressed", "true");

  const shown = page.getByTestId("current-date");
  const today = await shown.textContent();
  await page.getByRole("button", { name: "Jour précédent" }).click();
  await expect(shown).not.toHaveText(today!);
  await expect(count(page, "present")).toHaveText("0");
  await page.getByRole("button", { name: "Jour suivant" }).click();
  await expect(shown).toHaveText(today!);
  await expect(count(page, "present")).toHaveText("1");
});

test("filters the crew by team", async ({ page }) => {
  await openApp(page);
  await page.locator('[data-team="gardiens"]').click();
  await expect(page.locator("article")).toHaveCount(2);
  await expect(count(page, "unmarked")).toHaveText("2");
  await page.locator('[data-team="encadrement"]').click();
  await expect(page.locator("article")).toHaveCount(3);
  await expect(card(page, "Mohamed Bouzidi")).toContainText("Chef concassage");
  await expect(card(page, "Mohamed Bouzidi")).toContainText("Mensuel");
  await page.locator('[data-team="all"]').click();
  await expect(page.locator("article")).toHaveCount(15);
});
