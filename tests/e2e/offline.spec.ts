import { expect, test } from "@playwright/test";
import { card, count, openApp } from "./helpers";

/** Wait until the service worker has installed, precached and taken control. */
async function waitForServiceWorker(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }),
      );
    }
  });
}

test("cold-boots and records attendance with no network", async ({ page, context }) => {
  await openApp(page);
  await waitForServiceWorker(page);
  await card(page, "Mohamed Bouzidi").locator('[data-status="present"]').click();

  await context.setOffline(true);
  await page.reload();

  // The whole application comes back from the device.
  await expect(page.getByText("HORS LIGNE", { exact: true })).toBeVisible();
  await expect(page.getByText("Mode hors ligne")).toBeVisible();
  await expect(card(page, "Mohamed Bouzidi").locator('[data-status="present"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await card(page, "Omar Idrissi").locator('[data-status="absent"]').click();
  await expect(count(page, "absent")).toHaveText("1");

  // Arabic and Tifinagh fonts are on the device too.
  await page.getByRole("button", { name: "Langue" }).click();
  await page.locator('[data-lang="zgh"]').click();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Noto Sans Tifinagh"', "ⵉⵍⵍⴰ"))).toBe(true);

  await context.setOffline(false);
});

test("exports to Excel with no network", async ({ page, context }) => {
  await openApp(page);
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.reload();

  await card(page, "Brahim Oukacha").locator('[data-status="present"]').click();
  await page.getByRole("button", { name: "Exporter Excel" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Télécharger" }).click();
  expect((await download).suggestedFilename()).toMatch(/^pointage-\d{4}-\d{2}\.xlsx$/);

  await context.setOffline(false);
});

test("makes no request outside its own origin", async ({ page }) => {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://localhost:4173" && url.protocol !== "data:" && url.protocol !== "blob:") {
      foreign.push(request.url());
    }
  });
  await openApp(page);
  await waitForServiceWorker(page);
  await page.getByRole("button", { name: "Langue" }).click();
  await page.locator('[data-lang="ar"]').click();
  expect(foreign).toEqual([]);
});

test("is installable: manifest, icons and a controlling service worker", async ({ page, request }) => {
  await openApp(page);
  await waitForServiceWorker(page);

  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  const sizes = manifest.icons.map((icon: { sizes: string; purpose: string }) => `${icon.sizes} ${icon.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192 any", "512x512 any", "512x512 maskable"]));
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});
