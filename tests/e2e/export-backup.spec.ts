import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { card, count, openApp, todayISO } from "./helpers";

test("exports the month to Excel with pay computed by pay type", async ({ page }) => {
  await openApp(page);
  const month = todayISO().slice(0, 7);

  // A monthly driver with two hours of overtime, a daily hand present, a daily hand absent.
  const driver = card(page, "Saïd Ouhammou");
  await driver.locator('[data-status="present"]').click();
  const add = driver.getByRole("button", { name: "Ajouter une heure supplémentaire" });
  await add.click();
  await add.click();
  await card(page, "Brahim Oukacha").locator('[data-status="present"]').click();
  await card(page, "Ali Aït Baha").locator('[data-status="absent"]').click();
  await expect(count(page, "unmarked")).toHaveText("12");

  await page.getByRole("button", { name: "Exporter Excel" }).click();
  const dialog = page.getByRole("dialog");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Télécharger" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`pointage-${month}.xlsx`);
  await expect(dialog.getByText("Fichier généré.")).toBeVisible();

  const workbook = XLSX.read(readFileSync(await file.path()));
  expect(workbook.SheetNames).toEqual(["Récapitulatif", "Détail"]);

  const summary = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets["Récapitulatif"]);
  const row = (name: string) => summary.find((r) => r["Nom complet"] === name)!;

  // Monthly: the salary, plus 2 h at 25 MAD.
  expect(row("Saïd Ouhammou")).toMatchObject({
    "Mode de paie": "Mensuel",
    "Jours travaillés": 1,
    "Heures supplémentaires": 2,
    "Salaire de base (MAD)": 4500,
    "Heures sup. à payer (MAD)": 50,
    "Paie estimée (MAD)": 4550,
  });
  // Daily: one day at 100 MAD.
  expect(row("Brahim Oukacha")).toMatchObject({ "Mode de paie": "Journalier", "Paie estimée (MAD)": 100 });
  // Daily and absent: nothing.
  expect(row("Ali Aït Baha")).toMatchObject({ "Absences non justifiées": 1, "Paie estimée (MAD)": 0 });
  // Fifteen employees and the total line.
  expect(summary).toHaveLength(16);

  const detail = XLSX.utils.sheet_to_json(workbook.Sheets["Détail"]);
  expect(detail).toHaveLength(3);
});

test("says so when a month has no attendance", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Exporter Excel" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Télécharger" }).click();
  await expect(dialog.getByText("Aucun pointage pour ce mois.")).toBeVisible();
});

test("backs the data up to a file and restores it", async ({ page }) => {
  await openApp(page);
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();
  await expect(count(page, "present")).toHaveText("1");

  await page.getByRole("button", { name: "Sauvegarde" }).click();
  const dialog = page.getByRole("dialog");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exporter la sauvegarde" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^quarry-pointage-lite-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();
  const backup = JSON.parse(readFileSync(path, "utf8"));
  expect(backup.employees).toHaveLength(15);
  expect(backup.attendance).toHaveLength(1);
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  // Change the data, then restore the file.
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();
  await card(page, "Omar Idrissi").locator('[data-status="absent"]').click();
  await expect(count(page, "present")).toHaveText("0");

  await page.getByRole("button", { name: "Sauvegarde" }).click();
  await dialog.getByTestId("backup-file").setInputFiles(path);
  await expect(dialog.getByText(/15 ouvriers et 1 pointages/)).toBeVisible();
  await dialog.getByRole("button", { name: "Remplacer" }).click();
  await expect(dialog.getByText("Données restaurées.")).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  await expect(count(page, "present")).toHaveText("1");
  await expect(count(page, "absent")).toHaveText("0");
});

test("refuses a file that is not a backup, and changes nothing", async ({ page }) => {
  await openApp(page);
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();

  await page.getByRole("button", { name: "Sauvegarde" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("backup-file").setInputFiles({
    name: "autre.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "something-else", employees: [] })),
  });
  await expect(dialog.getByText("Fichier de sauvegarde invalide.")).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).first().click();
  await expect(count(page, "present")).toHaveText("1");
});
