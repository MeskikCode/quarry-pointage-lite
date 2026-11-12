"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  detectLanguage,
  dictionaries,
  directionOf,
  isLanguage,
  type Dictionary,
  type LanguageCode,
} from "./index";

interface I18nValue {
  lang: LanguageCode;
  dir: "ltr" | "rtl";
  t: Dictionary;
  /** False until the saved or detected language has been applied. */
  ready: boolean;
  setLang: (code: LanguageCode) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function readSavedLanguage(): LanguageCode | null {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // The page is prerendered in French; the device language is applied after
  // mount so the first client render matches the prerendered markup.
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only preference
    setLangState(readSavedLanguage() ?? detectLanguage(navigator.languages ?? []));
    setReady(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = directionOf(lang);
  }, [lang]);

  const setLang = useCallback((code: LanguageCode) => {
    setLangState(code);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Storage refused (private browsing): the choice lasts for the session.
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, dir: directionOf(lang), t: dictionaries[lang], ready, setLang }),
    [lang, ready, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
