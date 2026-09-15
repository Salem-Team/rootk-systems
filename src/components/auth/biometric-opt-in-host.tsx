"use client";

import { useEffect, useState } from "react";
import { BiometricOptInDialog } from "@/components/auth/biometric-opt-in-dialog";
import { markBiometricPrompted } from "@/services/biometric-auth.service";
import { useBiometricLockStore } from "@/stores/biometric-lock-store";

/** Shows biometric enable dialog after login lands in the authenticated shell. */
export function BiometricOptInHost() {
  const pending = useBiometricLockStore((s) => s.pendingOptIn);
  const clearPendingOptIn = useBiometricLockStore((s) => s.clearPendingOptIn);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pending) return;
    setOpen(true);
  }, [pending]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      markBiometricPrompted();
      clearPendingOptIn();
    }
  }

  return <BiometricOptInDialog open={open} onOpenChange={onOpenChange} />;
}
