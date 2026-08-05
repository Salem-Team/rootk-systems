"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const options: { value: Locale; label: string }[] = [
    { value: "ar", label: t("common.arabic") },
    { value: "en", label: t("common.english") },
  ];

  function selectLocale(next: Locale) {
    setLocale(next);
    if (userId) {
      void saveUserPreferences(userId, { language: next });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "full" ? "ghost" : "ghost"}
          size={variant === "full" ? "default" : "icon-sm"}
          aria-label={t("common.language")}
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => selectLocale(option.value)}
            className={locale === option.value ? "bg-accent" : undefined}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
