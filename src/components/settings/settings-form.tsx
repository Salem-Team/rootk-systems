"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Globe2,
  Loader2,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { CompanyPolicySection } from "@/components/settings/company-policy-section";
import { Button } from "@/components/ui/button";
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
  ensureUserPreferences,
  saveUserPreferences,
} from "@/services/user-preferences.service";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { Locale } from "@/i18n";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { UserPreferences } from "@/types/preferences";

type PrefSection = "appearance" | "notifications" | "profile" | "company";

const DEFAULT_NOTIFS: UserPreferences["notifications"] = {
  email: true,
  push: true,
  sound: true,
  attendanceReminders: true,
  leaveUpdates: true,
  announcements: true,
  system: true,
  work: true,
  payroll: true,
  schedule: true,
  mention: true,
};

export function SettingsForm({
  hideCompanyPolicy = false,
}: {
  hideCompanyPolicy?: boolean;
} = {}) {
  const { t, setLocale } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<PrefSection>("appearance");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let mountedFlag = true;
    setLoading(true);
    void ensureUserPreferences(user.id).then((res) => {
      if (!mountedFlag) return;
      if (res.success && res.data) setPrefs(res.data);
      setLoading(false);
    });
    return () => {
      mountedFlag = false;
    };
  }, [user.id]);

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    const res = await saveUserPreferences(user.id, {
      language: prefs.language,
      appearance: prefs.appearance,
      notifications: prefs.notifications,
    });
    setSaving(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setPrefs(res.data);
    setLocale(res.data.language as Locale);
    setTheme(res.data.appearance);
    toast.success(t("settings.prefsSaved"));
  }

  const navItems: { id: PrefSection; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    ...(hideCompanyPolicy
      ? []
      : [
          {
            id: "company" as const,
            label: t("settings.companyPolicy"),
            icon: Shield,
          },
        ]),
    { id: "profile", label: t("settings.myPreferences"), icon: UserRound },
  ];

  useEffect(() => {
    if (hideCompanyPolicy && section === "company") {
      setSection("appearance");
    }
  }, [hideCompanyPolicy, section]);

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav
          aria-label={t("settings.prefNavLabel")}
          className="surface-panel overflow-hidden"
        >
          <div className="hidden border-b border-border/60 px-4 py-3 lg:block">
            <p className="section-label text-primary/70">
              {t("settings.prefEyebrow")}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight">
              {t("settings.prefNavTitle")}
            </p>
          </div>
          <ul className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] lg:grid lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <li key={item.id} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setSection(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "relative flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-primary/[0.08] px-3 py-2.5 text-start text-[13px] font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:px-2.5 lg:py-2"
                        : "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:px-2.5 lg:py-2"
                    }
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="emp-settings-nav"
                        className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    ) : null}
                    <span
                      className={
                        isActive
                          ? "flex h-8 w-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 lg:h-7 lg:w-7 lg:rounded-md"
                          : "flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-muted/40 lg:h-7 lg:w-7 lg:rounded-md"
                      }
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {section === "appearance" ? (
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
                        const appearance =
                          v as UserPreferences["appearance"];
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
            ) : null}

            {section === "notifications" ? (
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
            ) : null}

            {section === "company" ? <CompanyPolicySection /> : null}

            {section === "profile" ? (
              <section className="surface-panel overflow-hidden">
                <div className="panel-header">
                  <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                    <UserRound className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {t("settings.myPreferences")}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("settings.myPreferencesDesc")}
                  </p>
                </div>
                <div className="panel-body grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
                    <p className="section-label">{t("common.email")}</p>
                    <p className="mt-1 text-sm font-semibold">{user.email}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
                    <p className="section-label">{t("common.status")}</p>
                    <p className="mt-1 text-sm font-semibold">
                      {t("status.active")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3 sm:col-span-2">
                    <p className="section-label text-primary/80">
                      {t("settings.workspaceHint")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("settings.workspaceHintDesc")}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {section === "company" ? null : (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
