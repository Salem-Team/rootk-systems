import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAttendanceStore } from "@/stores/attendance-store";
import { signInWithCredentials } from "@/services/auth.service";
import {
  bindBiometricUser,
  biometryLabelKey,
  canOfferBiometricLogin,
  checkBiometricSupport,
  getBiometricPreference,
  resumeStickySessionAfterBiometrics,
  shouldOfferBiometricOptIn,
  unlockWithBiometrics,
} from "@/services/biometric-auth.service";
import {
  loginCredentialsSchema,
  type LoginCredentialsDto,
} from "@/schemas/auth.schema";
import { useTranslation } from "@/hooks/use-translation";
import {
  getRememberMeDefault,
  getRememberedEmail,
  saveRememberedLogin,
} from "@/lib/auth/remember-me";
import { navigateToAppHome } from "@/lib/auth/navigate-after-login";
import { isNativeApp } from "@/lib/native/platform";
import { useBiometricLockStore } from "@/stores/biometric-lock-store";
import { flushSessionPersist, useSessionStore } from "@/stores/session-store";

/** Legacy key — cleared so old admin emails never reappear as defaults. */
const LEGACY_REMEMBERED_EMAIL_KEY = "rootk-login-email";

function clearLegacyRememberedEmail() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

function scrollFieldIntoView(target: HTMLElement) {
  window.setTimeout(() => {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, 280);
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function loginErrorMessage(
  code: string | undefined,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  switch (code) {
    case "UNAUTHORIZED":
    case "FORBIDDEN":
    case "VALIDATION":
      return t("auth.invalidCredentials");
    case "RATE_LIMIT":
      return t("auth.rateLimited");
    case "NETWORK":
    case "TIMEOUT":
      return t("auth.networkError");
    default:
      return t("auth.networkError");
  }
}

export function useLoginForm() {
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const resetAttendance = useAttendanceStore((s) => s.reset);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricKindLabel, setBiometricKindLabel] = useState(
    t("auth.biometric.generic")
  );
  const [biometricIsFace, setBiometricIsFace] = useState(false);

  const form = useForm<LoginCredentialsDto>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    clearLegacyRememberedEmail();
    const remember = getRememberMeDefault();
    setRememberMe(remember);
    const savedEmail =
      (remember ? getRememberedEmail() : null) ||
      getBiometricPreference().email ||
      "";
    form.reset({ email: savedEmail, password: "" });
    router.prefetch("/dashboard");
  }, [form, router]);

  useEffect(() => {
    if (!isNativeApp() || !canOfferBiometricLogin()) {
      setBiometricReady(false);
      return;
    }
    let cancelled = false;
    void checkBiometricSupport().then((info) => {
      if (cancelled) return;
      setBiometricReady(info.available);
      setBiometricIsFace(info.kind === "face");
      setBiometricKindLabel(
        t(biometryLabelKey(info.kind) as "auth.biometric.generic")
      );
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const submitting = form.formState.isSubmitting || success || biometricBusy;

  async function finishLoginNavigation() {
    // Sync WebView only — Keychain mirrors in background.
    try {
      await flushSessionPersist();
    } catch {
      /* in-memory session still valid for this process */
    }
    navigateToAppHome(router);
  }

  async function onSubmit(values: LoginCredentialsDto) {
    setFormError(null);
    resetAttendance();
    const email = values.email.trim();
    const res = await signInWithCredentials({
      email,
      password: values.password,
    });
    if (!res.success) {
      const message = loginErrorMessage(res.error?.code, t);
      setFormError(message);
      form.setFocus("password");
      return;
    }

    // Native always keeps sticky session; web follows the checkbox.
    const keepSession = isNativeApp() || rememberMe;
    saveRememberedLogin({
      remember: keepSession,
      email,
    });

    setSuccess(true);
    toast.success(t("auth.welcomeBack"), { duration: 1600 });

    const sessionUser = useSessionStore.getState().user;
    if (sessionUser?.id) {
      bindBiometricUser({
        userId: sessionUser.id,
        email: sessionUser.email,
      });
    }
    useBiometricLockStore.getState().setUnlocked(true);
    useBiometricLockStore.getState().markSkipNextAutoPrompt();

    // Never block navigation for biometric opt-in — offer it inside the app.
    if (isNativeApp() && shouldOfferBiometricOptIn()) {
      void checkBiometricSupport().then((support) => {
        if (support.available) {
          useBiometricLockStore.getState().requestOptIn();
        }
      });
    }

    await finishLoginNavigation();
  }

  async function onBiometricLogin() {
    if (biometricBusy || !biometricReady) return;
    setFormError(null);
    setBiometricBusy(true);
    const auth = await unlockWithBiometrics({
      reason: t("auth.biometric.unlockReason"),
      cancelTitle: t("common.cancel"),
      title: t("auth.biometric.unlockTitle"),
      subtitle: t("auth.biometric.unlockSubtitle"),
    });
    if (!auth.ok) {
      setBiometricBusy(false);
      if (!auth.cancelled) {
        setFormError(t("auth.biometric.failed"));
      }
      return;
    }

    const resumed = await resumeStickySessionAfterBiometrics();
    if (!resumed.ok) {
      setBiometricBusy(false);
      if (resumed.reason === "transient") {
        setFormError(t("auth.networkError"));
        return;
      }
      setFormError(t("auth.biometric.needPasswordOnce"));
      return;
    }

    useBiometricLockStore.getState().setUnlocked(true);
    useBiometricLockStore.getState().markSkipNextAutoPrompt();
    setSuccess(true);
    toast.success(t("auth.welcomeBack"), { duration: 1600 });
    await finishLoginNavigation();
    setBiometricBusy(false);
  }

  useEffect(() => {
    if (!formError) return;
    const sub = form.watch(() => setFormError(null));
    return () => sub.unsubscribe();
  }, [form, formError]);

  function onPasswordKeyEvent(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  function unlockField(field: "email" | "password") {
    if (field === "email") setEmailUnlocked(true);
    else setPasswordUnlocked(true);
  }

  function onFieldFocus(
    field: "email" | "password",
    event: FocusEvent<HTMLInputElement>
  ) {
    event.currentTarget.readOnly = false;
    unlockField(field);
    if (field === "email") setEmailFocused(true);
    else setPasswordFocused(true);
    if (isCoarsePointer()) {
      scrollFieldIntoView(event.currentTarget);
    }
  }

  function onFieldPointerDown(field: "email" | "password") {
    unlockField(field);
  }

  return {
    t,
    isRtl,
    form,
    submitting,
    success,
    showPassword,
    setShowPassword,
    capsLockOn,
    formError,
    emailFocused,
    setEmailFocused,
    passwordFocused,
    setPasswordFocused,
    emailUnlocked,
    passwordUnlocked,
    rememberMe,
    setRememberMe,
    biometricReady,
    biometricBusy,
    biometricKindLabel,
    biometricIsFace,
    onBiometricLogin,
    onSubmit,
    onPasswordKeyEvent,
    onFieldFocus,
    onFieldPointerDown,
  };
}
