"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Database,
  Globe2,
  Loader2,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { CompanyProfilePanel } from "@/components/admin/company-profile-panel";
import { WorkDeductionRulesPanel } from "@/components/admin/work-deduction-rules-panel";
import { WorkPoliciesPanel } from "@/components/admin/work-policies-panel";
import { ShiftsPanel } from "@/components/admin/shifts-panel";
import { WfhPolicyPanel } from "@/components/admin/wfh-policy-panel";
import { DepartmentsAdminPanel } from "@/components/admin/departments-admin-panel";
import { PositionsAdminPanel } from "@/components/admin/positions-admin-panel";
import { LocationsAdminPanel } from "@/components/admin/locations-admin-panel";
import { CompanyCalendarAdminPanel } from "@/components/admin/company-calendar-admin-panel";
import { EmployeePreferencesPanel } from "@/components/admin/employee-preferences-panel";
import {
  ApprovalsPanel,
  NotificationSettingsPanel,
} from "@/components/admin/notifications-approvals-panels";
import type { AdminSection } from "@/components/admin/admin-mock-data";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settings-store";
import { useDemoData } from "@/hooks/use-demo-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { normalizeCompanyNotifications } from "@/lib/notification-policy";
import type { CompanySettings } from "@/types";

export function CompanyAdminWorkspace() {
  const { t } = useTranslation();
  const { settings, isSaving, fetchSettings, saveSettings } = useSettingsStore();
  const { setTheme, theme } = useTheme();
  const demo = useDemoData();
  const [section, setSection] = useState<AdminSection>("profile");
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<CompanySettings>(settings);

  useEffect(() => {
    setMounted(true);
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setForm({
      ...settings,
      notifications: normalizeCompanyNotifications(settings.notifications),
    });
  }, [settings]);

  function updateField<K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateNotification(
    key: keyof CompanySettings["notifications"],
    value: boolean
  ) {
    setForm((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }

  function patchNotifications(
    patch: Partial<CompanySettings["notifications"]>
  ) {
    setForm((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...patch },
    }));
  }

  async function handleSave() {
    const ok = await saveSettings({
      name: form.name,
      legalName: form.legalName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      website: form.website,
      timezone: form.timezone,
      currency: form.currency,
      language: form.language,
      appearance: form.appearance,
      notifications: form.notifications,
    });

    if (!ok) {
      toast.error(t("errors.saveSettings"));
      return;
    }

    if (form.appearance === "system") setTheme("system");
    else setTheme(form.appearance);

    toast.success(t("settings.saved"));
  }

  const showSave =
    section === "profile" ||
    section === "notifications" ||
    section === "appearance";

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <AdminSectionNav active={section} onChange={setSection} />
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
            {section === "profile" ? (
              <CompanyProfilePanel
                form={form}
                onChange={updateField}
                onNavigate={setSection}
              />
            ) : null}
            {section === "policies" ? (
              <div className="space-y-5">
                <WorkPoliciesPanel />
                <WorkDeductionRulesPanel />
              </div>
            ) : null}
            {section === "shifts" ? <ShiftsPanel /> : null}
            {section === "wfh" ? <WfhPolicyPanel /> : null}
            {section === "departments" ? <DepartmentsAdminPanel /> : null}
            {section === "positions" ? <PositionsAdminPanel /> : null}
            {section === "locations" ? <LocationsAdminPanel /> : null}
            {section === "calendar" ? <CompanyCalendarAdminPanel /> : null}
            {section === "notifications" ? (
              <NotificationSettingsPanel
                form={form}
                onChange={updateNotification}
                onPatch={patchNotifications}
              />
            ) : null}
            {section === "approvals" ? <ApprovalsPanel /> : null}
            {section === "employeePrefs" ? <EmployeePreferencesPanel /> : null}
            {section === "myPrefs" ? (
              <SettingsForm hideCompanyPolicy />
            ) : null}
            {section === "appearance" ? (
              <motion.section
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="surface-panel overflow-hidden"
              >
                <div className="panel-header">
                  <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                    <Palette className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {t("settings.appearance")}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("settings.appearanceDesc")}
                    {mounted ? ` · ${theme ?? t("common.system")}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    {t("admin.companyDefaultsHint")}
                  </p>
                </div>
                <div className="panel-body grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("settings.theme")}</Label>
                    <Select
                      value={form.appearance}
                      onValueChange={(v) => {
                        const appearance = v as CompanySettings["appearance"];
                        updateField("appearance", appearance);
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
                      value={form.language}
                      onValueChange={(v) => {
                        const language = v as CompanySettings["language"];
                        updateField("language", language);
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
              </motion.section>
            ) : null}
            {section === "demo" ? (
              <motion.section
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="surface-panel overflow-hidden"
              >
                <div className="panel-header">
                  <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                    <Database className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {t("settings.demoData")}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("settings.demoDataDesc")}
                  </p>
                </div>
                <div className="panel-body flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="outline"
                    className="border-primary/20"
                    disabled={demo.busy !== null}
                    onClick={() => {
                      if (window.confirm(t("settings.resetDemoConfirm"))) {
                        void demo.resetDemoData();
                      }
                    }}
                  >
                    {demo.busy === "reset" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RotateCcw />
                    )}
                    {t("settings.resetDemo")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={demo.busy !== null}
                    onClick={() => void demo.generateSampleData()}
                  >
                    {demo.busy === "generate" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                    {t("settings.generateSample")}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={demo.busy !== null}
                    onClick={() => {
                      if (window.confirm(t("settings.clearDataConfirm"))) {
                        void demo.clearData();
                      }
                    }}
                  >
                    {demo.busy === "clear" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                    {t("settings.clearData")}
                  </Button>
                </div>
              </motion.section>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {showSave ? (
          <div className="flex justify-end">
            <Button size="lg" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              {t("common.save")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
