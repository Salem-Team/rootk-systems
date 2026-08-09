import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Bell, KeyRound, Palette, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  ensureUserPreferences,
  saveUserPreferences,
} from "@/services/user-preferences.service";
import { changeOwnPassword } from "@/services/auth.service";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { Locale } from "@/i18n";
import type { UserPreferences } from "@/types/preferences";

export type PrefSection =
  | "appearance"
  | "notifications"
  | "profile"
  | "company"
  | "security";

export const DEFAULT_NOTIFS: UserPreferences["notifications"] = {
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

export function useSettingsForm({
  hideCompanyPolicy = false,
}: {
  hideCompanyPolicy?: boolean;
}) {
  const { t, setLocale } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<PrefSection>("appearance");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  async function handleChangePassword() {
    if (newPassword.trim().length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    setPasswordSaving(true);
    const res = await changeOwnPassword({
      currentPassword,
      newPassword: newPassword.trim(),
    });
    setPasswordSaving(false);
    if (!res.success) {
      const message =
        res.error?.code === "UNAUTHORIZED"
          ? t("settings.currentPasswordWrong")
          : (res.message ?? t("settings.passwordChangeFailed"));
      toast.error(message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success(t("settings.passwordChanged"));
  }

  const navItems: { id: PrefSection; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "security", label: t("settings.security"), icon: KeyRound },
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

  return {
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
  };
}
