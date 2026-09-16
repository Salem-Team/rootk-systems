"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { App } from "@capacitor/app";
import { Fingerprint, Loader2, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LOGO_SRC } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { isNativeApp } from "@/lib/native/platform";
import {
  biometryLabelKey,
  checkBiometricSupport,
  getBiometricPreference,
  isBiometricUnlockEnabled,
  unlockWithBiometrics,
} from "@/services/biometric-auth.service";
import { signOutSession } from "@/services/auth.service";
import { useBiometricLockStore } from "@/stores/biometric-lock-store";
import { useSessionStore } from "@/stores/session-store";
import { useRouter } from "next/navigation";

/** Relock after the app was backgrounded longer than this. */
const BACKGROUND_RELOCK_MS = 5 * 60_000;

/**
 * Native-only gate: when biometric unlock is enabled, require Face ID /
 * fingerprint before showing the authenticated shell. Tokens stay in Keychain.
 */
export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const unlocked = useBiometricLockStore((s) => s.unlocked);
  const setUnlocked = useBiometricLockStore((s) => s.setUnlocked);
  const consumeSkip = useBiometricLockStore((s) => s.consumeSkipNextAutoPrompt);
  const email = useSessionStore((s) => s.user.email);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"face" | "fingerprint" | "other">("other");
  const [kindLabel, setKindLabel] = useState(t("auth.biometric.generic"));
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const enabled = isNativeApp() && isBiometricUnlockEnabled();

  const refreshKind = useCallback(async () => {
    const info = await checkBiometricSupport();
    setKind(
      info.kind === "face"
        ? "face"
        : info.kind === "fingerprint"
          ? "fingerprint"
          : "other"
    );
    setKindLabel(t(biometryLabelKey(info.kind) as "auth.biometric.generic"));
  }, [t]);

  const unlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await unlockWithBiometrics({
        reason: t("auth.biometric.unlockReason"),
        cancelTitle: t("common.cancel"),
        title: t("auth.biometric.unlockTitle"),
        subtitle: t("auth.biometric.unlockSubtitle"),
      });
      if (res.ok) {
        setUnlocked(true);
        setError(null);
        return;
      }
      if (!res.cancelled) {
        setError(t("auth.biometric.failed"));
      }
    } catch {
      setError(t("auth.biometric.failed"));
    } finally {
      setBusy(false);
    }
  }, [busy, setUnlocked, t]);

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      return;
    }
    void refreshKind();
  }, [enabled, refreshKind, setUnlocked]);

  useEffect(() => {
    if (!enabled || unlocked) return;
    if (consumeSkip()) {
      setUnlocked(true);
      return;
    }
    if (autoTried.current) return;
    autoTried.current = true;
    void unlock();
  }, [enabled, unlocked, consumeSkip, setUnlocked, unlock]);

  useEffect(() => {
    if (!enabled || !isNativeApp()) return;
    const handle = App.addListener("appStateChange", (state) => {
      if (!state.isActive) {
        backgroundedAt.current = Date.now();
        return;
      }
      const started = backgroundedAt.current;
      backgroundedAt.current = null;
      if (started == null) return;
      if (Date.now() - started < BACKGROUND_RELOCK_MS) return;
      if (!getBiometricPreference().enabled) return;
      autoTried.current = false;
      setUnlocked(false);
    });
    return () => {
      void Promise.resolve(handle).then((h) => h.remove());
    };
  }, [enabled, setUnlocked]);

  async function signOutToLogin() {
    setBusy(true);
    await signOutSession();
    useBiometricLockStore.getState().reset();
    setBusy(false);
    router.replace("/login");
  }

  if (!enabled || unlocked) {
    return <>{children}</>;
  }

  const FaceOrPrint = kind === "face" ? ScanFace : Fingerprint;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#020814] px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <Image
          src={LOGO_SRC}
          alt={t("app.short")}
          width={64}
          height={64}
          className="h-full w-full object-contain p-1.5"
          priority
        />
      </div>
      <div className="max-w-sm text-center">
        <h1 className="font-display text-xl font-bold tracking-tight">
          {t("auth.biometric.lockTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#8aa0c0]">
          {t("auth.biometric.lockDesc", { method: kindLabel })}
        </p>
        {email ? (
          <p className="mt-1 font-mono text-[12px] text-[#6b7f9c]">{email}</p>
        ) : null}
      </div>

      {error ? (
        <p className="max-w-sm text-center text-[13px] text-rose-300">{error}</p>
      ) : null}

      <div className="flex w-full max-w-sm flex-col gap-2.5">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full gap-2"
          disabled={busy}
          onClick={() => void unlock()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FaceOrPrint className="h-4 w-4" />
          )}
          {t("auth.biometric.unlockCta", { method: kindLabel })}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-white/80 hover:bg-white/10 hover:text-white"
          disabled={busy}
          onClick={() => void signOutToLogin()}
        >
          {t("auth.biometric.usePassword")}
        </Button>
      </div>
      {!busy ? (
        <button
          type="button"
          className="text-[12px] text-[#6b7f9c] underline-offset-2 hover:underline"
          onClick={() => {
            toast.message(t("auth.biometric.hint"));
          }}
        >
          {t("auth.biometric.hint")}
        </button>
      ) : null}
    </div>
  );
}
