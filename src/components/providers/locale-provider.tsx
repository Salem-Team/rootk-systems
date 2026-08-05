"use client";

import { useEffect } from "react";
import { getDir } from "@/i18n";
import { useLocaleStore } from "@/stores/locale-store";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    const dir = getDir(locale);
    root.lang = locale;
    root.dir = dir;
    root.setAttribute("data-locale", locale);
  }, [locale]);

  return <>{children}</>;
}
