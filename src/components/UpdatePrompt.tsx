"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/env";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "./ui/Button";

/**
 * Registers the service worker and announces a new version.
 *
 * A new worker installs in the background and then waits: it is never
 * activated under a supervisor who is in the middle of a shift. The prompt
 * appears once the new version is ready; tapping it activates the worker and
 * reloads. Attendance data lives in IndexedDB and is not touched by this.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const track = (registration: ServiceWorkerRegistration) => {
      // Only a worker that replaces an active one is an update.
      const offer = () => {
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
      };
      offer();
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed") offer();
        });
      });
    };

    navigator.serviceWorker
      .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
      .then(track)
      .catch(() => {
        // Registration refused (unsupported context). The application still
        // works while the page is open; it only cannot cold-boot offline.
      });
  }, []);

  if (!waiting) return null;

  const activate = () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div
      role="status"
      className="mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-md items-center justify-between gap-3 rounded-panel border-2 border-accent bg-ink p-3"
    >
      <p className="text-base font-semibold text-white">{t.update.title}</p>
      <Button size="lg" icon={RefreshCw} onClick={activate}>
        {t.update.action}
      </Button>
    </div>
  );
}
