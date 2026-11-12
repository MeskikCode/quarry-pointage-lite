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

test("counts overtime hours, and offers none to an unmarked or absent worker", async ({ page }) => {
  await openApp(page);
  const worker = card(page, "Hassan Aït Lahcen");
  const quick = worker.locator("[data-overtime-quick]");
  const stepper = worker.locator("[data-overtime]");
  const add = worker.getByRole("button", { name: "Ajouter une heure supplémentaire" });
  const remove = worker.getByRole("button", { name: "Retirer une heure supplémentaire" });

  // Nothing to adjust before the worker is marked.
  await expect(add).toHaveCount(0);

  // Marked: a single "+1 h" keeps the card short.
  await worker.locator('[data-status="present"]').click();
  await expect(quick).toBeVisible();
  await expect(stepper).toHaveCount(0);

  // The first hour reveals the full stepper.
  await add.click();
  await expect(quick).toHaveCount(0);
  await expect(stepper).toContainText("1");
  await add.click();
  await expect(stepper).toContainText("2");
  await remove.click();
  await expect(stepper).toContainText("1");

  // Back to zero: the card returns to its short form.
  await remove.click();
  await expect(stepper).toHaveCount(0);
  await expect(quick).toBeVisible();

  // An absent worker has no overtime at all.
  await add.click();
  await worker.locator('[data-status="absent"]').click();
  await expect(stepper).toHaveCount(0);
  await expect(quick).toHaveCount(0);
  await expect(add).toHaveCount(0);
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

test("marks the whole crew present in one tap, keeps the exceptions, and can undo", async ({ page }) => {
  const app = await openApp(page);
  await card(page, "Brahim Oukacha").locator('[data-status="absent"]').click();
  await card(page, "Omar Idrissi").locator('[data-status="late"]').click();
  await expect(count(page, "unmarked")).toHaveText("13");

  await page.locator('[data-action="all-present"]').click();
  await expect(page.getByTestId("bulk-done")).toHaveText("13 employés marqués présents.");
  await expect(count(page, "present")).toHaveText("14");
  await expect(count(page, "absent")).toHaveText("1");
  await expect(count(page, "unmarked")).toHaveText("0");
  // The exceptions keep their own status.
  await expect(card(page, "Brahim Oukacha").locator('[data-status="absent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(card(page, "Omar Idrissi").locator('[data-status="late"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Nothing is left to mark: the button goes away.
  await expect(page.locator('[data-action="all-present"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByTestId("bulk-done")).toHaveCount(0);
  await expect(count(page, "unmarked")).toHaveText("13");
  await expect(count(page, "absent")).toHaveText("1");
  await expect(card(page, "Omar Idrissi").locator('[data-status="late"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  app.expectNoErrors();
});

test("marks only the filtered team, and drops the undo notice when the context changes", async ({ page }) => {
  await openApp(page);
  await page.locator('[data-team="gardiens"]').click();
  await page.locator('[data-action="all-present"]').click();
  await expect(page.getByTestId("bulk-done")).toHaveText("2 employés marqués présents.");
  await page.locator('[data-team="all"]').click();
  await expect(count(page, "present")).toHaveText("2");
  await expect(count(page, "unmarked")).toHaveText("13");
  await expect(page.getByTestId("bulk-done")).toHaveCount(0);
});

test("keeps each card to one row of status buttons", async ({ page }) => {
  await openApp(page);
  const worker = card(page, "Mohamed Bouzidi");
  const buttons = worker.locator("[data-status]");
  await expect(buttons).toHaveCount(4);
  const tops = await buttons.evaluateAll((all) => all.map((b) => Math.round(b.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  // Fifteen people must not take fifteen screens: an unmarked card stays short.
  const box = await worker.boundingBox();
  expect(box!.height).toBeLessThan(170);
  // Targets stay at the gloved size.
  const heights = await buttons.evaluateAll((all) => all.map((b) => b.getBoundingClientRect().height));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(56);
});
