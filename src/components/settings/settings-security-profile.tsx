"use client";

import { useRouter } from "next/navigation";
import { KeyRound, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import type { SessionUser } from "@/stores/session-store";

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
      </div>
    </section>
  );
}
