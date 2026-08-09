"use client";

import { motion } from "framer-motion";
import { Bell, Globe2, Moon, Palette, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_NOTIFS,
} from "@/components/settings/use-settings-form";
import { useTranslation } from "@/hooks/use-translation";
import type { Locale } from "@/i18n";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { UserPreferences } from "@/types/preferences";

export function SettingsAppearanceSection({
  prefs,
  setPrefs,
  setTheme,
  theme,
  mounted,
  setLocale,
}: {
  prefs: UserPreferences;
  setPrefs: (updater: (p: UserPreferences | null) => UserPreferences | null) => void;
  setTheme: (theme: string) => void;
  theme: string | undefined;
  mounted: boolean;
  setLocale: (locale: Locale) => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Palette className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("settings.appearance")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.personalAppearanceDesc")}
          {mounted ? ` · ${theme ?? t("common.system")}` : ""}
        </p>
      </div>
      <div className="panel-body grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("settings.theme")}</Label>
          <Select
            value={prefs.appearance}
            onValueChange={(v) => {
              const appearance = v as UserPreferences["appearance"];
              setPrefs((p) => (p ? { ...p, appearance } : p));
              setTheme(appearance);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4" /> {t("common.system")}
                </span>
              </SelectItem>
              <SelectItem value="light">
                <span className="inline-flex items-center gap-2">
                  <Sun className="h-4 w-4" /> {t("common.light")}
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="inline-flex items-center gap-2">
                  <Moon className="h-4 w-4" /> {t("common.dark")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("settings.languageSection")}</Label>
          <Select
            value={prefs.language}
            onValueChange={(v) => {
              const language = v as UserPreferences["language"];
              setPrefs((p) => (p ? { ...p, language } : p));
              setLocale(language as Locale);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("common.english")}</SelectItem>
              <SelectItem value="ar">{t("common.arabic")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}

export function SettingsNotificationsSection({
  prefs,
  setPrefs,
}: {
  prefs: UserPreferences;
  setPrefs: (updater: (p: UserPreferences | null) => UserPreferences | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Bell className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("settings.notifications")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.personalNotifDesc")}
        </p>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="panel-body space-y-2.5"
      >
        {(
          [
            ["email", t("settings.emailNotif")],
            ["push", t("settings.pushNotif")],
            ["sound", t("settings.soundNotif")],
            ["attendanceReminders", t("settings.attendanceReminders")],
            ["leaveUpdates", t("settings.leaveUpdates")],
            ["schedule", t("admin.notifSchedule")],
            ["work", t("admin.notifWork")],
            ["payroll", t("admin.notifPayroll")],
            ["announcements", t("admin.notifAnnouncements")],
            ["mention", t("admin.notifMention")],
            ["system", t("admin.notifSystem")],
          ] as const
        ).map(([key, title]) => (
          <motion.div
            key={key}
            variants={fadeInUp}
            className="list-row flex items-center justify-between gap-4 px-3.5 py-3"
          >
            <p className="text-sm font-medium">{title}</p>
            <Switch
              checked={prefs.notifications[key] ?? DEFAULT_NOTIFS[key]}
              onCheckedChange={(v) =>
                setPrefs((p) =>
                  p
                    ? {
                        ...p,
                        notifications: {
                          ...p.notifications,
                          [key]: v,
                        },
                      }
                    : p
                )
              }
              aria-label={title}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
