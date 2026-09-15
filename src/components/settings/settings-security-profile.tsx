"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  KeyRound,
  Loader2,
  ScanFace,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/hooks/use-translation";
import { isNativeApp } from "@/lib/native/platform";
import {
  biometryLabelKey,
  checkBiometricSupport,
  disableBiometricUnlock,
  enableBiometricUnlock,
  getBiometricPreference,
} from "@/services/biometric-auth.service";
import { useBiometricLockStore } from "@/stores/biometric-lock-store";
import type { SessionUser } from "@/stores/session-store";
import { useSessionStore } from "@/stores/session-store";

export function SettingsBiometricSection() {
  const { t } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [method, setMethod] = useState(t("auth.biometric.generic"));
  const [face, setFace] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    void checkBiometricSupport().then((info) => {
      if (cancelled) return;
      setVisible(true);
      setAvailable(info.available);
      setEnabled(getBiometricPreference().enabled);
      setMethod(t(biometryLabelKey(info.kind) as "auth.biometric.generic"));
      setFace(info.kind === "face");
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!visible) return null;

  const Icon = face ? ScanFace : Fingerprint;

  async function onToggle(next: boolean) {
    if (busy) return;
    if (!next) {
      disableBiometricUnlock();
      setEnabled(false);
      toast.success(t("auth.biometric.disabled"));
      return;
    }
    if (!available) {
      toast.error(t("auth.biometric.unavailable"));
      return;
    }
    setBusy(true);
    const res = await enableBiometricUnlock({
      userId: user.id,
      email: user.email,
      reason: t("auth.biometric.enableReason"),
      cancelTitle: t("common.cancel"),
      title: t("auth.biometric.enableTitle"),
      subtitle: t("auth.biometric.enableSubtitle"),
    });
    setBusy(false);
    if (!res.ok) {
      if (!res.cancelled) toast.error(t("auth.biometric.enableFailed"));
      setEnabled(false);
      return;
    }
    setEnabled(true);
    useBiometricLockStore.getState().setUnlocked(true);
    useBiometricLockStore.getState().markSkipNextAutoPrompt();
    toast.success(t("auth.biometric.enabled"));
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("settings.biometric")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.biometricDesc", { method })}
        </p>
      </div>
      <div className="panel-body flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t("settings.biometricToggle", { method })}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {available
              ? t("settings.biometricHint")
              : t("auth.biometric.unavailable")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <Switch
            checked={enabled}
            disabled={busy || (!available && !enabled)}
            onCheckedChange={(value) => void onToggle(value)}
            aria-label={t("settings.biometricToggle", { method })}
          />
        </div>
      </div>
    </section>
  );
}

export function SettingsSecuritySection({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordSaving,
  handleChangePassword,
}: {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordSaving: boolean;
  handleChangePassword: () => void | Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <KeyRound className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("settings.security")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.securityDesc")}
        </p>
      </div>
      <div className="panel-body grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-current-password">
            {t("settings.currentPassword")}
          </Label>
          <Input
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-new-password">
            {t("settings.newPassword")}
          </Label>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-confirm-password">
            {t("settings.confirmNewPassword")}
          </Label>
          <Input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="button"
            onClick={() => void handleChangePassword()}
            disabled={
              passwordSaving ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {passwordSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {t("settings.changePassword")}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SettingsProfileSection({ user }: { user: SessionUser }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
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
          <p className="mt-1 text-sm font-semibold">{t("status.active")}</p>
        </div>
        <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3 sm:col-span-2">
          <p className="section-label text-primary/80">
            {t("settings.workspaceHint")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.workspaceHintDesc")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => router.push("/profile")}
          >
            <UserRound className="h-3.5 w-3.5" />
            {t("common.profile")}
          </Button>
        </div>
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 px-3.5 py-3 sm:col-span-2">
          <p className="section-label text-rose-800/80">
            {t("settings.deleteAccount")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.deleteAccountDesc")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/account-deletion")}
            >
              {t("settings.deleteAccount")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/privacy")}
            >
              {t("settings.privacyPolicy")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/terms")}
            >
              {t("settings.termsOfUse")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
