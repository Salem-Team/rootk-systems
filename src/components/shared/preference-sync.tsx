"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { ensureUserPreferences } from "@/services/user-preferences.service";
import { useLocaleStore } from "@/stores/locale-store";
import { useSessionStore } from "@/stores/session-store";
import type { Locale } from "@/i18n";

/**
 * Applies the signed-in user's personal preferences once per user switch.
 * Must not re-run on theme toggles — that snaps dark/light back to saved prefs.
 */
export function PreferenceSync() {
  const userId = useSessionStore((s) => s.user.id);
  const authenticated = useSessionStore((s) => s.authenticated);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { setTheme } = useTheme();
  const appliedUserId = useRef<string | null>(null);
  const setLocaleRef = useRef(setLocale);
  const setThemeRef = useRef(setTheme);
  setLocaleRef.current = setLocale;
  setThemeRef.current = setTheme;

  useEffect(() => {
    if (!authenticated || !userId) {
      appliedUserId.current = null;
      return;
    }
    if (appliedUserId.current === userId) return;

    let cancelled = false;
    const syncFor = userId;

    void ensureUserPreferences(syncFor).then((res) => {
      if (cancelled || syncFor !== userId) return;
      if (!res.success || !res.data) return;
      appliedUserId.current = syncFor;
      setLocaleRef.current(res.data.language as Locale);
      setThemeRef.current(res.data.appearance);
    });

    return () => {
      cancelled = true;
    };
  }, [authenticated, userId]);

  return null;
}
