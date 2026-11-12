"use client";

import { useCallback, useEffect, useState } from "react";

/** The browser's install prompt (Chrome, Edge, Samsung Internet). Not in the DOM typings. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function runningInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/**
 * Offer to install the application from inside it. Browsers that support it
 * announce, once, that the application can be installed; the event is kept so
 * that the button can open the browser's own install dialog later.
 * Safari has no such event: there, the README explains the Share menu.
 */
export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the display mode
    setInstalled(runningInstalled());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    // The event can be used only once.
    setPrompt(null);
  }, [prompt]);

  return { canInstall: prompt !== null && !installed, installed, install };
}
