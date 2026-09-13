"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { saveUserPreferences } from "@/services/user-preferences.service";
import { useSessionStore } from "@/stores/session-store";
import type { Locale } from "@/i18n";

export function LanguageSwitcher({
  variant = "icon",
}: {
  variant?: "icon" | "full";
}) {
  const { t, locale, setLocale } = useTranslation();
  const userId = useSessionStore((s) => s.user.id);

  function toggleLocale() {
    const next: Locale = locale === "ar" ? "en" : "ar";
    setLocale(next);
    if (userId) {
      void saveUserPreferences(userId, { language: next });
    }
  }

  return (
    <Button
      variant="ghost"
      size={variant === "full" ? "default" : "icon-sm"}
      aria-label={t("common.language")}
      onClick={toggleLocale}
      className={
        variant === "full"
          ? "gap-2 text-white hover:bg-white/10 hover:text-white"
          : undefined
      }
    >
      <Languages className="h-4 w-4" />
      {variant === "full" ? (
        <span>{locale === "ar" ? t("common.arabic") : t("common.english")}</span>
      ) : null}
    </Button>
  );
}
