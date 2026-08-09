"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { CompanyPolicySection } from "@/components/settings/company-policy-section";
import { Button } from "@/components/ui/button";
import { SettingsNav } from "@/components/settings/settings-nav";
import {
  SettingsAppearanceSection,
  SettingsNotificationsSection,
} from "@/components/settings/settings-appearance-notifications";
import {
  SettingsProfileSection,
  SettingsSecuritySection,
} from "@/components/settings/settings-security-profile";
import { useSettingsForm } from "@/components/settings/use-settings-form";

export function SettingsForm({
  hideCompanyPolicy = false,
}: {
  hideCompanyPolicy?: boolean;
} = {}) {
  const {
    t,
    setLocale,
    user,
    setTheme,
    theme,
    mounted,
    section,
    setSection,
    saving,
    loading,
    prefs,
    setPrefs,
    passwordSaving,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    handleSave,
    handleChangePassword,
    navItems,
  } = useSettingsForm({ hideCompanyPolicy });

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
        <SettingsNav
          navItems={navItems}
          section={section}
          setSection={setSection}
          navLabel={t("settings.prefNavLabel")}
          eyebrow={t("settings.prefEyebrow")}
          title={t("settings.prefNavTitle")}
        />
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
              <SettingsAppearanceSection
                prefs={prefs}
                setPrefs={setPrefs}
                setTheme={setTheme}
                theme={theme}
                mounted={mounted}
                setLocale={setLocale}
              />
            ) : null}

            {section === "notifications" ? (
              <SettingsNotificationsSection prefs={prefs} setPrefs={setPrefs} />
            ) : null}

            {section === "company" ? <CompanyPolicySection /> : null}

            {section === "security" ? (
              <SettingsSecuritySection
                currentPassword={currentPassword}
                setCurrentPassword={setCurrentPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                passwordSaving={passwordSaving}
                handleChangePassword={handleChangePassword}
              />
            ) : null}

            {section === "profile" ? (
              <SettingsProfileSection user={user} />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {section === "company" || section === "security" ? null : (
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
