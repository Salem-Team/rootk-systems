"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import {
  biometryLabelKey,
  checkBiometricSupport,
  enableBiometricUnlock,
  markBiometricPrompted,
} from "@/services/biometric-auth.service";
import { useBiometricLockStore } from "@/stores/biometric-lock-store";
import { useSessionStore } from "@/stores/session-store";

/** Shown once after a successful password login on a biometric-capable device. */
export function BiometricOptInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState(t("auth.biometric.generic"));
  const [face, setFace] = useState(false);

  useEffect(() => {
    if (!open) return;
    void checkBiometricSupport().then((info) => {
      setMethod(t(biometryLabelKey(info.kind) as "auth.biometric.generic"));
      setFace(info.kind === "face");
    });
  }, [open, t]);

  async function enable() {
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
      if (!res.cancelled) {
        toast.error(t("auth.biometric.enableFailed"));
      }
      return;
    }
    useBiometricLockStore.getState().setUnlocked(true);
    useBiometricLockStore.getState().markSkipNextAutoPrompt();
    toast.success(t("auth.biometric.enabled"));
    onOpenChange(false);
  }

  function skip() {
    markBiometricPrompted();
    onOpenChange(false);
  }

  const Icon = face ? ScanFace : Fingerprint;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
            {t("auth.biometric.optInTitle", { method })}
          </DialogTitle>
          <DialogDescription>
            {t("auth.biometric.optInDesc", { method })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={skip}
          >
            {t("auth.biometric.notNow")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void enable()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {t("auth.biometric.enable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
