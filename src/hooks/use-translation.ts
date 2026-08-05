"use client";

import { useCallback, useMemo } from "react";
import {
  getDictionary,
  getDir,
  translate,
  type Locale,
  type TranslationPath,
} from "@/i18n";
import { useLocaleStore } from "@/stores/locale-store";

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const dir = useMemo(() => getDir(locale), [locale]);

  const t = useCallback(
    (path: TranslationPath, vars?: Record<string, string | number>) =>
      translate(dict, path, vars),
    [dict]
  );

  return {
    t,
    locale,
    dir,
    isRtl: dir === "rtl",
    setLocale: (next: Locale) => setLocale(next),
    toggleLocale,
    dict,
  };
}
