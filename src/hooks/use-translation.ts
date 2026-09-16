"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ensureDictionary,
  getDictionary,
  getDir,
  preloadInactiveDictionary,
  translate,
  type Locale,
  type TranslationKeys,
  type TranslationPath,
} from "@/i18n";
import { useLocaleStore } from "@/stores/locale-store";

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [dict, setDict] = useState<TranslationKeys>(() =>
    getDictionary(locale)
  );

  useEffect(() => {
    let cancelled = false;
    setDict(getDictionary(locale));
    void ensureDictionary(locale).then((next) => {
      if (!cancelled) setDict(next);
    });
    preloadInactiveDictionary(locale);
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const dir = useMemo(() => getDir(locale), [locale]);

  const t = useCallback(
    (path: TranslationPath, vars?: Record<string, string | number>) =>
      translate(dict, path, vars),
    [dict]
  );

  const switchLocale = useCallback(
    (next: Locale) => {
      void ensureDictionary(next).then(() => setLocale(next));
    },
    [setLocale]
  );

  const switchToggle = useCallback(() => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    switchLocale(next);
  }, [locale, switchLocale]);

  return {
    t,
    locale,
    dir,
    isRtl: dir === "rtl",
    setLocale: switchLocale,
    toggleLocale: switchToggle,
    dict,
  };
}
