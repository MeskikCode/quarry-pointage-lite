import type { PointageDB } from "./db";

export const SITE_NAME_KEY = "siteName";
export const MAX_SITE_NAME = 60;

/** The site's name, as typed, without surrounding spaces. Empty if none. */
export function cleanSiteName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_SITE_NAME);
}

export async function readSiteName(db: PointageDB): Promise<string> {
  return (await db.settings.get(SITE_NAME_KEY))?.value ?? "";
}

/** Store the site's name. An empty name removes it. */
export async function writeSiteName(db: PointageDB, name: string): Promise<void> {
  const value = cleanSiteName(name);
  if (value) await db.settings.put({ key: SITE_NAME_KEY, value });
  else await db.settings.delete(SITE_NAME_KEY);
}
