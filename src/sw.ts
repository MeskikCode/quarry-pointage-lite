/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry } from "serwist";

/**
 * Service worker.
 *
 * The whole application is a static export of about one megabyte, so all of
 * it is precached at install: after the first visit every screen, font and
 * the spreadsheet library are on the device, and the application cold-boots
 * with no network at all. Nothing is fetched at runtime, so there are no
 * runtime caching rules.
 *
 * `__SW_MANIFEST` is replaced at build time by scripts/build-sw.mjs with the
 * list of files in the export and their content hashes.
 */
declare const self: ServiceWorkerGlobalScope;
declare const __SW_MANIFEST: PrecacheEntry[];

const serwist = new Serwist({
  precacheEntries: __SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    // Installed apps and shared links may add query parameters.
    ignoreURLParametersMatching: [/.*/],
  },
  // A new version waits until the supervisor accepts it (UpdatePrompt).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
});

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();
