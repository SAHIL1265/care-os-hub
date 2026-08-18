import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { DEFAULT_LANGUAGE, getLanguageMeta, type LanguageCode } from "./i18n-languages";
import { DICTIONARIES, en, type TranslationKey } from "./i18n-translations";

const STORAGE_KEY = "sahara.language";

type I18nValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nValue | undefined>(undefined);

function applyDocumentLanguage(code: LanguageCode) {
  if (typeof document === "undefined") return;
  const meta = getLanguageMeta(code);
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
  document.documentElement.style.setProperty("--font-display", meta.font);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  // Restore the saved language: localStorage first (instant), then the
  // signed-in user's stored preference from the backend (source of truth).
  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (stored && getLanguageMeta(stored).code === stored) {
        setLanguageState(stored);
        applyDocumentLanguage(stored);
      } else {
        applyDocumentLanguage(DEFAULT_LANGUAGE);
      }
    } catch {
      applyDocumentLanguage(DEFAULT_LANGUAGE);
    }
    setReady(true);

    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || cancelled) return;
        const { data } = await supabase
          .from("profiles").select("language").eq("id", auth.user.id).maybeSingle();
        const remote = data?.language as LanguageCode | undefined;
        if (!cancelled && remote && getLanguageMeta(remote).code === remote) {
          setLanguageState(remote);
          applyDocumentLanguage(remote);
          try { localStorage.setItem(STORAGE_KEY, remote); } catch {}
        }
      } catch {
        // Language loading failure falls back to the local/default language.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    applyDocumentLanguage(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey) => DICTIONARIES[language]?.[key] ?? en[key] ?? key,
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t, ready }), [language, setLanguage, t, ready]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key: TranslationKey) => en[key] ?? key,
      ready: false,
    };
  }
  return ctx;
}

export type { TranslationKey };
