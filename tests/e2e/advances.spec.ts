import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { expectNoSidewaysScroll, openApp } from "./helpers";

const monthRow = (page: Page, name: string) => page.locator(`[data-month-row="${name}"]`);

/** Everyone present, then the month view. */
async function toMonthView(page: Page) {
  await page.locator('[data-action="all-present"]').click();
  await page.locator('[data-view="month"]').click();
  await expect(page.getByTestId("month-total")).toBeVisible();
}

async function openAdvances(page: Page, name: string) {
  await page.locator(`[data-advances-open="${name}"]`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function addAdvance(dialog: ReturnType<Page["getByRole"]>, amount: string, note = "") {
  await dialog.locator('[name="amount"]').fill(amount);
  if (note) await dialog.locator('[name="note"]').fill(note);
  // The submit button, whatever the language.
  await dialog.locator('button[type="submit"]').click();
}

test("records advances, deducts them from what is left to pay, and deletes one after confirmation", async ({ page }) => {
  const app = await openApp(page);
  await toMonthView(page);

  // Nothing advanced yet: the whole salary is left to pay.
  await expect(monthRow(page, "Omar Idrissi").locator("[data-pay]")).toContainText(/5\s500,00/);
  await expect(page.getByTestId("month-gross")).toContainText(/47\s980,00/);
  await expect(page.getByTestId("month-total")).toContainText(/47\s980,00/);

  const dialog = await openAdvances(page, "Omar Idrissi");
  await expect(dialog.getByTestId("advance-empty")).toBeVisible();

  // An empty form is refused.
  await dialog.getByRole("button", { name: "Ajouter l'avance" }).click();
  await expect(dialog.getByText("Saisir un montant supérieur à 0.")).toBeVisible();
  await expect(dialog.locator("[data-advance]")).toHaveCount(0);

  // A date outside the month shown is refused, and nothing is stored.
  await dialog.locator('[name="amount"]').fill("100");
  await dialog.locator('[name="date"]').fill("2000-01-01");
  await dialog.getByRole("button", { name: "Ajouter l'avance" }).click();
  await expect(dialog.getByText("La date doit être dans le mois affiché.")).toBeVisible();
  await expect(dialog.locator("[data-advance]")).toHaveCount(0);

  // Two valid advances, one typed with a thousands space and one with a decimal comma.
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  await dialog.locator('[name="date"]').fill(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`);
  await addAdvance(dialog, "1 000", "Réparation");
  await expect(dialog.locator("[data-advance]")).toHaveCount(1);
  await expect(dialog.locator('[name="amount"]')).toHaveValue("");
  await addAdvance(dialog, "500,5");
  await expect(dialog.locator("[data-advance]")).toHaveCount(2);
  await expect(dialog.getByTestId("advance-total")).toContainText(/1\s500,50/);
  await expect(dialog.locator("[data-advance]").first()).toContainText("Réparation");
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  // The month view now shows what is left to pay, with the gross figure behind it.
  const omar = monthRow(page, "Omar Idrissi");
  await expect(omar.locator("[data-pay]")).toContainText(/3\s999,50/);
  await expect(omar.locator("[data-pay]")).toContainText(/Brut\s+5\s500,00/);
  await expect(omar.locator("[data-advance-amount]")).toContainText(/1\s500,50/);
  await expect(page.getByTestId("month-advances")).toContainText(/1\s500,50/);
  await expect(page.getByTestId("month-gross")).toContainText(/47\s980,00/);
  await expect(page.getByTestId("month-total")).toContainText(/46\s479,50/);

  // Deleting needs a second, explicit tap. Cancelling keeps the advance.
  const again = await openAdvances(page, "Omar Idrissi");
  await again.getByRole("button", { name: "Supprimer l'avance" }).first().click();
  await expect(again.locator("[data-advance-confirm]")).toBeVisible();
  await expect(again.locator("[data-advance]")).toHaveCount(2);
  await again.getByRole("button", { name: "Annuler" }).click();
  await expect(again.locator("[data-advance-confirm]")).toHaveCount(0);
  await expect(again.locator("[data-advance]")).toHaveCount(2);

  await again.getByRole("button", { name: "Supprimer l'avance" }).first().click();
  await again.locator("[data-advance-confirm]").click();
  await expect(again.locator("[data-advance]")).toHaveCount(1);
  await expect(again.getByTestId("advance-total")).toContainText(/500,50/);
  await again.getByRole("button", { name: "Fermer" }).first().click();
  await expect(monthRow(page, "Omar Idrissi").locator("[data-pay]")).toContainText(/4\s999,50/);

  // Another month is untouched: advances belong to the month of their date.
  await page.getByRole("button", { name: "Mois précédent" }).click();
  await expect(page.getByTestId("month-advances")).toContainText("0,00");
  app.expectNoErrors();
});

test("shows a negative balance in red when more was advanced than is due", async ({ page }) => {
  await openApp(page);
  await toMonthView(page);

  // A daily worker is due one day, 100 MAD. Advance 400.
  const dialog = await openAdvances(page, "Brahim Oukacha");
  await addAdvance(dialog, "400");
  await expect(dialog.locator("[data-advance]")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  const pay = monthRow(page, "Brahim Oukacha").locator("[data-pay]");
  await expect(pay).toContainText(/-300,00/);
  await expect(pay.locator("span.num").first()).toHaveClass(/text-danger/);
  await expect(monthRow(page, "Brahim Oukacha").locator("[data-advance-amount]")).toContainText(/400,00/);
});

test("carries advances into the Excel file and through backup and restore", async ({ page }) => {
  await openApp(page);
  await page.locator('[data-view="month"]').click();

  // 250 MAD for a monthly employee with no attendance: salary 5 500, left to pay 5 250.
  const dialog = await openAdvances(page, "Omar Idrissi");
  await addAdvance(dialog, "250", "Avance de test");
  await expect(dialog.locator("[data-advance]")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  // The Excel file has the advance on its own sheet and in the summary.
  await page.getByRole("button", { name: "Exporter Excel" }).click();
  const exporter = page.getByRole("dialog");
  const xlsxDownload = page.waitForEvent("download");
  await exporter.getByRole("button", { name: "Télécharger" }).click();
  const xlsxFile = await xlsxDownload;
  await expect(exporter.getByText("Fichier généré.")).toBeVisible();
  const book = XLSX.read(readFileSync(await xlsxFile.path()));
  expect(book.SheetNames).toEqual(["Récapitulatif", "Détail", "Avances"]);
  const summary = XLSX.utils.sheet_to_json<Record<string, string | number>>(book.Sheets["Récapitulatif"], { range: 2 });
  expect(summary.find((r) => r["Nom complet"] === "Omar Idrissi")).toMatchObject({
    "Paie estimée (MAD)": 5500,
    "Avances (MAD)": 250,
    "Reste à payer (MAD)": 5250,
  });
  const sheet = XLSX.utils.sheet_to_json<Record<string, string | number>>(book.Sheets["Avances"], { range: 2 });
  expect(sheet).toHaveLength(2);
  expect(sheet[0]).toMatchObject({ "Nom complet": "Omar Idrissi", "Montant (MAD)": 250, Note: "Avance de test" });
  expect(sheet[1]).toMatchObject({ Date: "Total", "Montant (MAD)": 250 });
  await exporter.getByRole("button", { name: "Fermer" }).first().click();

  // Back it up, add another advance, then restore: the second one is gone.
  await page.getByRole("button", { name: "Sauvegarde" }).click();
  const backupDialog = page.getByRole("dialog");
  const jsonDownload = page.waitForEvent("download");
  await backupDialog.getByRole("button", { name: "Exporter la sauvegarde" }).click();
  const jsonFile = await jsonDownload;
  const path = await jsonFile.path();
  const backup = JSON.parse(readFileSync(path, "utf8"));
  expect(backup.version).toBe(2);
  expect(backup.advances).toEqual([
    expect.objectContaining({ amount: 250, note: "Avance de test" }),
  ]);
  await backupDialog.getByRole("button", { name: "Fermer" }).first().click();

  const more = await openAdvances(page, "Omar Idrissi");
  await addAdvance(more, "300");
  await expect(more.locator("[data-advance]")).toHaveCount(2);
  await more.getByRole("button", { name: "Fermer" }).first().click();
  await expect(page.getByTestId("month-advances")).toContainText(/550,00/);

  await page.getByRole("button", { name: "Sauvegarde" }).click();
  await backupDialog.getByTestId("backup-file").setInputFiles(path);
  await backupDialog.getByRole("button", { name: "Remplacer" }).click();
  await expect(backupDialog.getByText("Données restaurées.")).toBeVisible();
  await backupDialog.getByRole("button", { name: "Fermer" }).first().click();
  await expect(page.getByTestId("month-advances")).toContainText(/250,00/);
  await expect(page.getByTestId("month-advances")).not.toContainText(/550,00/);
});

test("accepts a backup made before advances existed, and clears the advances", async ({ page }) => {
  await openApp(page);
  await page.locator('[data-view="month"]').click();
  const dialog = await openAdvances(page, "Omar Idrissi");
  await addAdvance(dialog, "100");
  await dialog.getByRole("button", { name: "Fermer" }).first().click();
  await expect(page.getByTestId("month-advances")).toContainText(/100,00/);

  // A version 1 file: no advances table.
  const old = {
    app: "quarry-pointage-lite",
    version: 1,
    exportedAt: "2026-11-01T08:00:00.000Z",
    employees: [{ id: 1, fullName: "Ancien Employé", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true }],
    attendance: [],
  };
  await page.getByRole("button", { name: "Sauvegarde" }).click();
  const backupDialog = page.getByRole("dialog");
  await backupDialog.getByTestId("backup-file").setInputFiles({
    name: "ancienne-sauvegarde.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(old)),
  });
  await backupDialog.getByRole("button", { name: "Remplacer" }).click();
  await expect(backupDialog.getByText("Données restaurées.")).toBeVisible();
  await backupDialog.getByRole("button", { name: "Fermer" }).first().click();

  await expect(monthRow(page, "Ancien Employé")).toBeVisible();
  await expect(page.getByTestId("month-advances")).toContainText("0,00");
});

test("the advances dialog follows the language and fits the screen", async ({ page }) => {
  await openApp(page, "ar");
  await page.locator('[data-view="month"]').click();
  const dialog = await openAdvances(page, "Omar Idrissi");
  await expect(dialog.getByRole("heading", { name: "التسبيقات" })).toBeVisible();
  await addAdvance(dialog, "1200");
  await expect(dialog.locator("[data-amount]").first()).toHaveCSS("direction", "ltr");
  await expect(dialog.getByTestId("advance-total")).toBeVisible();
  await expectNoSidewaysScroll(page);

  await dialog.getByRole("button", { name: "إغلاق" }).first().click();
  await expect(monthRow(page, "Omar Idrissi").locator("[data-advance-amount]")).toContainText(/1\s200,00/);
});
