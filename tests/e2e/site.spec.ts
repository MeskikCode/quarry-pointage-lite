import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { card, count, openApp, todayISO } from "./helpers";

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Réglages" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Réglages" })).toBeVisible();
  return dialog;
}

/** A local `YYYY-MM-DD`, `days` before today. */
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test("names the site, in the header, the Excel file and the backup", async ({ page }) => {
  const app = await openApp(page);
  await expect(page.getByTestId("site-name")).toHaveText("Pointage Carrière");

  const dialog = await openSettings(page);
  await dialog.locator('[name="siteName"]').fill("  Carrière   Oued Tensift ");
  await dialog.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(dialog.getByText("Nom enregistré.")).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).first().click();
  await expect(page.getByTestId("site-name")).toHaveText("Carrière Oued Tensift");

  await page.reload();
  await expect(page.getByTestId("site-name")).toHaveText("Carrière Oued Tensift");

  // The Excel file carries the name in its title.
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();
  await page.getByRole("button", { name: "Exporter Excel" }).click();
  const exporter = page.getByRole("dialog");
  const download = page.waitForEvent("download");
  await exporter.getByRole("button", { name: "Télécharger" }).click();
  const book = XLSX.read(readFileSync(await (await download).path()));
  expect(String(book.Sheets["Récapitulatif"]["A1"].v)).toMatch(/^Carrière Oued Tensift — \d{2}\/\d{4}$/);
  expect(String(book.Sheets["Détail"]["A1"].v)).toMatch(/^Carrière Oued Tensift · Détail/);
  await exporter.getByRole("button", { name: "Fermer" }).first().click();

  // And so does the backup.
  await page.getByRole("button", { name: "Sauvegarde" }).click();
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Exporter la sauvegarde" }).click();
  const backup = JSON.parse(readFileSync(await (await backupDownload).path(), "utf8"));
  expect(backup.version).toBe(3);
  expect(backup.settings).toEqual({ siteName: "Carrière Oued Tensift" });
  app.expectNoErrors();
});

test("deletes an employee entered by mistake, but never one with history", async ({ page }) => {
  await openApp(page);

  // An employee with history can only be deactivated.
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();
  await card(page, "Mohamed Bouzidi").getByRole("button", { name: /Modifier/ }).click();
  let dialog = page.getByRole("dialog");
  await dialog.locator('[data-action="employee-delete"]').click();
  await expect(dialog.getByText(/Le désactiver pour garder son historique/)).toBeVisible();
  await expect(dialog.locator('[data-action="employee-delete-confirm"]')).toHaveCount(0);
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(card(page, "Mohamed Bouzidi")).toBeVisible();

  // One with nothing on record can be deleted, after a second tap.
  await card(page, "Hamid Oubella").getByRole("button", { name: /Modifier/ }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator('[data-action="employee-delete"]').click();
  await dialog.locator('[data-action="employee-delete-confirm"]').click();
  await expect(dialog).toBeHidden();
  await expect(card(page, "Hamid Oubella")).toHaveCount(0);
  await expect(page.locator("article")).toHaveCount(14);
});

test("erases everything to start from an empty list, and stays empty", async ({ page }) => {
  await openApp(page);
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();

  const dialog = await openSettings(page);
  await dialog.locator('[name="siteName"]').fill("Carrière");
  await dialog.getByRole("button", { name: "Enregistrer le nom" }).click();
  await dialog.locator('[data-action="erase"]').click();
  // Nothing happens before the second tap.
  await expect(dialog.locator('[data-action="erase-confirm"]')).toBeVisible();
  await dialog.locator('[data-action="erase-confirm"]').click();
  await expect(dialog.getByText("Toutes les données ont été effacées.")).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  await expect(page.locator("article")).toHaveCount(0);
  await expect(page.getByText("Aucun employé dans cette équipe.")).toBeVisible();
  await expect(page.getByTestId("site-name")).toHaveText("Pointage Carrière");

  await page.reload();
  await expect(page.getByText("Aucun employé dans cette équipe.")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0);
  await expect(count(page, "unmarked")).toHaveText("0");
});

test("shows one employee's month day by day, day and night shifts", async ({ page }) => {
  const app = await openApp(page);
  const omar = card(page, "Omar Idrissi");
  await omar.locator('[data-status="present"]').click();
  await omar.locator("[data-overtime-quick]").click();
  await page.locator('[data-shift="nuit"]').click();
  await card(page, "Omar Idrissi").locator('[data-status="late"]').click();

  await page.locator('[data-view="month"]').click();
  await page.locator('[data-calendar-open="Omar Idrissi"]').click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Calendrier du mois" })).toBeVisible();

  const day = dialog.locator(`[data-day="${todayISO()}"]`);
  await expect(day.locator('[data-shift="jour"]')).toHaveAttribute("data-status", "present");
  await expect(day.locator('[data-shift="nuit"]')).toHaveAttribute("data-status", "late");
  await expect(day).toContainText("Jour: Présent, +1 h; Nuit: Retard");

  // Every day of the month is there, and the totals match.
  const [y, m] = todayISO().split("-").map(Number);
  await expect(dialog.locator("[data-day]")).toHaveCount(new Date(y, m, 0).getDate());
  await expect(dialog.locator("dl")).toContainText("2");
  app.expectNoErrors();
});

test("reminds to back up, and stops once a backup is made", async ({ page }) => {
  await openApp(page);
  // A fresh device with today's attendance only: no reminder yet.
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();
  await expect(page.getByTestId("backup-reminder")).toHaveCount(0);

  // The last backup was ten days ago.
  await page.evaluate((date) => localStorage.setItem("qp_last_backup", date), daysAgo(10));
  await page.reload();
  await expect(page.getByTestId("backup-reminder")).toHaveText("Dernière sauvegarde il y a 10 jours.");

  await page.locator('[data-action="backup-reminder"]').click();
  const dialog = page.getByRole("dialog");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exporter la sauvegarde" }).click();
  await download;
  await dialog.getByRole("button", { name: "Fermer" }).first().click();
  await expect(page.getByTestId("backup-reminder")).toHaveCount(0);
});

test("reminds a device that has never been backed up, once its data is a few days old", async ({ page }) => {
  await openApp(page);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Jour précédent" }).click();
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();
  await expect(page.getByTestId("backup-reminder")).toHaveText(
    "Aucune sauvegarde n'a encore été faite sur cet appareil.",
  );
});

test("offers to install the application when the browser allows it", async ({ page }) => {
  await openApp(page);

  // Without the browser's go-ahead, the dialog explains the manual way.
  let dialog = await openSettings(page);
  await expect(dialog.getByText(/Sur iPhone/)).toBeVisible();
  await expect(dialog.locator('[data-action="install"]')).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  // The browser announces the application can be installed.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = async () => {
      (window as unknown as { prompted: boolean }).prompted = true;
    };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });

  dialog = await openSettings(page);
  await dialog.locator('[data-action="install"]').click();
  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await expect(dialog.getByText("L'application est installée sur cet appareil.")).toBeVisible();
});
