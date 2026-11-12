import { expect, test } from "@playwright/test";
import { card, openApp } from "./helpers";

test("registers an employee on a post the list does not have", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Nouvel employé" }).click();
  const dialog = page.getByRole("dialog");

  // An empty form is refused, with one message per missing field.
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog.getByText("Saisir le nom complet.")).toBeVisible();
  await expect(dialog.getByText("Saisir un salaire valide.")).toBeVisible();

  await dialog.locator('[name="fullName"]').fill("Ali Pompiste");
  await dialog.locator('[name="post"]').selectOption("autre");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog.getByText("Saisir l'intitulé du poste.")).toBeVisible();

  await dialog.locator('[name="postLabel"]').fill("Pompiste");
  await expect(dialog.locator('[data-pay="daily"]')).toHaveAttribute("aria-pressed", "true");
  await dialog.locator('[name="rate"]').fill("110");
  await dialog.locator('[name="overtimeRate"]').fill("15");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();

  await expect(dialog).toBeHidden();
  const added = card(page, "Ali Pompiste");
  await expect(added).toContainText("Pompiste");
  await expect(added).toContainText("Journalier");
  await expect(page.locator("article")).toHaveCount(16);
});

test("proposes the usual pay type of a post and lets the supervisor change it", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Nouvel employé" }).click();
  const dialog = page.getByRole("dialog");

  await dialog.locator('[name="post"]').selectOption("soudeur");
  await expect(dialog.locator('[data-pay="monthly"]')).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByText("Salaire mensuel (MAD)")).toBeVisible();

  await dialog.locator('[name="post"]').selectOption("gardien");
  await expect(dialog.locator('[data-pay="daily"]')).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByText("Salaire journalier (MAD)")).toBeVisible();

  await dialog.locator('[data-pay="monthly"]').click();
  await dialog.locator('[name="fullName"]').fill("Gardien Mensuel");
  await dialog.locator('[name="rate"]').fill("3000");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(card(page, "Gardien Mensuel")).toContainText("Mensuel");
});

test("edits and deactivates an employee without losing their history", async ({ page }) => {
  await openApp(page);
  const worker = card(page, "Hamid Oubella");
  await worker.locator('[data-status="present"]').click();

  await worker.getByRole("button", { name: /Modifier/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="fullName"]').fill("Hamid Oubella Fils");
  await dialog.locator('[name="active"]').uncheck();
  await dialog.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.locator("article")).toHaveCount(14);
  await expect(card(page, "Hamid Oubella Fils")).toHaveCount(0);

  await page.getByLabel(/Afficher les inactifs/).check();
  const inactive = card(page, "Hamid Oubella Fils");
  await expect(inactive).toContainText("Inactif");
  // An inactive employee cannot be marked; they can be reactivated.
  await expect(inactive.locator("[data-status]")).toHaveCount(0);

  await inactive.getByRole("button", { name: /Modifier/ }).click();
  await dialog.locator('[name="active"]').check();
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(card(page, "Hamid Oubella Fils").locator('[data-status="present"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
