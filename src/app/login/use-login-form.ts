import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAttendanceStore } from "@/stores/attendance-store";
import { signInWithCredentials } from "@/services/auth.service";
import {
  loginCredentialsSchema,
  type LoginCredentialsDto,
} from "@/schemas/auth.schema";
import { useTranslation } from "@/hooks/use-translation";
import { flushSessionPersist } from "@/stores/session-store";

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
  }, 120);
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
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

  async function onSubmit(values: LoginCredentialsDto) {
    setFormError(null);
    resetAttendance();
    const res = await signInWithCredentials({
      email: values.email.trim(),
      password: values.password,
    });
    if (!res.success) {
      const code = res.error?.code;
      const message =
        code === "UNAUTHORIZED"
          ? t("auth.invalidCredentials")
          : t("auth.networkError");
      setFormError(message);
      form.setFocus("password");
      return;
    }
    setSuccess(true);
    toast.success(t("auth.welcomeBack"), { duration: 1600 });
    try {
      await flushSessionPersist();
    } catch {
      /* still navigate — in-memory session is already applied */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    router.replace("/dashboard");
  }

  useEffect(() => {
    if (!formError) return;
    const sub = form.watch(() => setFormError(null));
    return () => sub.unsubscribe();
  }, [form, formError]);

  function onPasswordKeyEvent(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  function onFieldFocus(
    field: "email" | "password",
    event: FocusEvent<HTMLInputElement>
  ) {
    // Unlock immediately so password managers / typing work on first tap.
    event.currentTarget.readOnly = false;
    if (field === "email") {
      setEmailFocused(true);
      setEmailUnlocked(true);
    } else {
      setPasswordFocused(true);
      setPasswordUnlocked(true);
    }
    if (isCoarsePointer()) {
      scrollFieldIntoView(event.currentTarget);
    }
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
    onSubmit,
    onPasswordKeyEvent,
    onFieldFocus,
  };
}
