"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import type { AdminSection } from "@/components/admin/admin-mock-data";
import {
  ADMIN_SECTION_PERMISSION,
  hasPermissionId,
  type PermissionId,
} from "@/constants/permissions";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsStore } from "@/stores/settings-store";
import { useDemoData } from "@/hooks/use-demo-data";
import { useTranslation } from "@/hooks/use-translation";
import { normalizeCompanyNotifications } from "@/lib/notification-policy";
import { cn } from "@/lib/utils";
import type { CompanySettings } from "@/types";

const panelLoading = () => <Skeleton className="h-64 w-full rounded-xl" />;

const CompanyProfilePanel = dynamic(
  () =>
    import("@/components/admin/company-profile-panel").then(
      (m) => m.CompanyProfilePanel
    ),
  { loading: panelLoading }
);
const WorkDeductionRulesPanel = dynamic(
  () =>
    import("@/components/admin/work-deduction-rules-panel").then(
      (m) => m.WorkDeductionRulesPanel
    ),
  { loading: panelLoading }
);
const WorkPoliciesPanel = dynamic(
  () =>
    import("@/components/admin/work-policies-panel").then(
      (m) => m.WorkPoliciesPanel
    ),
  { loading: panelLoading }
);
const ShiftsPanel = dynamic(
  () => import("@/components/admin/shifts-panel").then((m) => m.ShiftsPanel),
  { loading: panelLoading }
);
const WfhPolicyPanel = dynamic(
  () =>
    import("@/components/admin/wfh-policy-panel").then((m) => m.WfhPolicyPanel),
  { loading: panelLoading }
);
const DepartmentsAdminPanel = dynamic(
  () =>
    import("@/components/admin/departments-admin-panel").then(
      (m) => m.DepartmentsAdminPanel
    ),
  { loading: panelLoading }
);
const PositionsAdminPanel = dynamic(
  () =>
    import("@/components/admin/positions-admin-panel").then(
      (m) => m.PositionsAdminPanel
    ),
  { loading: panelLoading }
);
const LocationsAdminPanel = dynamic(
  () =>
    import("@/components/admin/locations-admin-panel").then(
      (m) => m.LocationsAdminPanel
    ),
  { loading: panelLoading }
);
const CompanyCalendarAdminPanel = dynamic(
  () =>
    import("@/components/admin/company-calendar-admin-panel").then(
      (m) => m.CompanyCalendarAdminPanel
    ),
  { loading: panelLoading }
);
const EmployeePreferencesPanel = dynamic(
  () =>
    import("@/components/admin/employee-preferences-panel").then(
      (m) => m.EmployeePreferencesPanel
    ),
  { loading: panelLoading }
);
const UserAccountsPanel = dynamic(
  () =>
    import("@/components/admin/user-accounts-panel").then(
      (m) => m.UserAccountsPanel
    ),
  { loading: panelLoading }
);
const ApprovalsPanel = dynamic(
  () =>
    import("@/components/admin/notifications-approvals-panels").then(
      (m) => m.ApprovalsPanel
    ),
  { loading: panelLoading }
);
const NotificationSettingsPanel = dynamic(
  () =>
    import("@/components/admin/notifications-approvals-panels").then(
      (m) => m.NotificationSettingsPanel
    ),
  { loading: panelLoading }
);
const CompanyAppearanceSection = dynamic(
  () =>
    import("@/components/admin/company-appearance-section").then(
      (m) => m.CompanyAppearanceSection
    ),
  { loading: panelLoading }
);
const CompanyDemoDataSection = dynamic(
  () =>
    import("@/components/admin/company-demo-data-section").then(
      (m) => m.CompanyDemoDataSection
    ),
  { loading: panelLoading }
);
const SettingsForm = dynamic(
  () =>
    import("@/components/settings/settings-form").then((m) => m.SettingsForm),
  { loading: panelLoading }
);

export function CompanyAdminWorkspace() {
  const { t } = useTranslation();
  const { settings, isSaving, fetchSettings, saveSettings } = useSettingsStore();
  const { setTheme, theme } = useTheme();
  const demo = useDemoData();
  const permissions = useSessionStore((s) => s.permissions);
  const role = useSessionStore((s) => s.role);
  const [section, setSection] = useState<AdminSection>("profile");
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<CompanySettings>(settings);

  useEffect(() => {
    setMounted(true);
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const required = ADMIN_SECTION_PERMISSION[section] as PermissionId | null;
    if (!required) return;
    if (hasPermissionId(required, permissions, role)) return;
    const entries = Object.entries(ADMIN_SECTION_PERMISSION) as Array<
      [AdminSection, PermissionId | null]
    >;
    const canOpen = ([, perm]: [AdminSection, PermissionId | null]) =>
      !perm || hasPermissionId(perm, permissions, role);
    const fallback =
      entries.find(([id, perm]) => id !== "myPrefs" && canOpen([id, perm])) ??
      entries.find(canOpen);
    setSection(fallback?.[0] ?? "myPrefs");
  }, [permissions, role, section]);

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
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="max-lg:contents lg:sticky lg:top-20 lg:self-start">
        <AdminSectionNav active={section} onChange={setSection} />
      </aside>

      <div
        className={cn(
          "min-w-0 space-y-4",
          showSave && "max-lg:pb-16"
        )}
      >
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
            {section === "accounts" ? <UserAccountsPanel /> : null}
            {section === "employeePrefs" ? <EmployeePreferencesPanel /> : null}
            {section === "myPrefs" ? (
              <SettingsForm hideCompanyPolicy />
            ) : null}
            {section === "appearance" ? (
              <CompanyAppearanceSection
                form={form}
                mounted={mounted}
                theme={theme}
                onAppearanceChange={(appearance) => {
                  updateField("appearance", appearance);
                  setTheme(appearance);
                }}
                onLanguageChange={(language) => updateField("language", language)}
              />
            ) : null}
            {section === "demo" ? <CompanyDemoDataSection demo={demo} /> : null}
          </motion.div>
        </AnimatePresence>

        {showSave ? (
          <div className="pointer-events-none max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[var(--mobile-action-bottom)] max-lg:z-30 max-lg:px-3 lg:flex lg:justify-end">
            <Button
              size="lg"
              className="pointer-events-auto w-full min-h-12 shadow-[var(--shadow-float)] lg:w-auto lg:min-h-10 lg:shadow-none"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              {t("common.save")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
