import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAttendanceStore } from "@/stores/attendance-store";
import { signInWithCredentials } from "@/services/auth.service";
import {
  bindBiometricUser,
  checkBiometricSupport,
  markBiometricPrompted,
  shouldOfferBiometricOptIn,
} from "@/services/biometric-auth.service";
import {
  loginCredentialsSchema,
  type LoginCredentialsDto,
} from "@/schemas/auth.schema";
import { useTranslation } from "@/hooks/use-translation";
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
  const [biometricOptInOpen, setBiometricOptInOpen] = useState(false);

  const form = useForm<LoginCredentialsDto>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    clearLegacyRememberedEmail();
    // Keep fields empty — never seed admin or last-used credentials.
    form.reset({ email: "", password: "" });
    router.prefetch("/dashboard");
  }, [form, router]);

  const submitting = form.formState.isSubmitting || success;

  async function finishLoginNavigation() {
    try {
      await flushSessionPersist();
    } catch {
      /* in-memory session is already applied — still navigate */
    }
    // Brief pause so native secure storage can settle before route change.
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    router.replace("/dashboard");
  }

  async function onSubmit(values: LoginCredentialsDto) {
    setFormError(null);
    resetAttendance();
    const res = await signInWithCredentials({
      email: values.email.trim(),
      password: values.password,
    });
    if (!res.success) {
      const message = loginErrorMessage(res.error?.code, t);
      setFormError(message);
      form.setFocus("password");
      return;
    }
    setSuccess(true);
    toast.success(t("auth.welcomeBack"), { duration: 1600 });

    const sessionUser = useSessionStore.getState().user;
    bindBiometricUser({
      userId: sessionUser.id,
      email: sessionUser.email,
    });
    useBiometricLockStore.getState().setUnlocked(true);
    useBiometricLockStore.getState().markSkipNextAutoPrompt();

    if (isNativeApp() && shouldOfferBiometricOptIn()) {
      const support = await checkBiometricSupport();
      if (support.available) {
        setBiometricOptInOpen(true);
        return;
      }
    }

    await finishLoginNavigation();
  }

  async function onBiometricOptInOpenChange(open: boolean) {
    setBiometricOptInOpen(open);
    if (!open && success) {
      markBiometricPrompted();
      await finishLoginNavigation();
    }
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
    // Unlock immediately so password managers / typing work on first tap.
    event.currentTarget.readOnly = false;
    unlockField(field);
    if (field === "email") setEmailFocused(true);
    else setPasswordFocused(true);
    if (isCoarsePointer()) {
      scrollFieldIntoView(event.currentTarget);
    }
  }

  function onFieldPointerDown(field: "email" | "password") {
    // iOS/Android: unlock before focus so the first keystroke is not dropped.
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
    biometricOptInOpen,
    onBiometricOptInOpenChange,
    onSubmit,
    onPasswordKeyEvent,
    onFieldFocus,
    onFieldPointerDown,
  };
}
