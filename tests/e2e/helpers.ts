import { expect, type Locator, type Page } from "@playwright/test";

/** Open the application in French with a fresh database, and fail the test
 * on any error the page reports. */
export async function openApp(page: Page, language = "fr") {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.addInitScript((code) => {
    if (!window.localStorage.getItem("qp_lang")) window.localStorage.setItem("qp_lang", code);
  }, language);

  await page.goto("/");
  await expect(page.locator("article").first()).toBeVisible();
  return {
    /** Call at the end of a test: the page must not have reported an error. */
    expectNoErrors: () => expect(errors).toEqual([]),
  };
}

export const card = (page: Page, name: string): Locator => page.getByRole("article", { name });

export const count = (page: Page, id: "present" | "absent" | "unmarked"): Locator =>
  page.locator(`[data-count="${id}"]`);

/** The page must never scroll sideways, at any width, in any language. */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Today as the application stores it: the local calendar day. */
export function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
