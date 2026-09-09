import { useEffect, useState, type KeyboardEvent } from "react";
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

const REMEMBERED_EMAIL_KEY = "rootk-login-email";

function readRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function rememberEmail(email: string) {
  try {
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore quota / private mode */
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
  const [preferPasswordFocus, setPreferPasswordFocus] = useState(false);

  const form = useForm<LoginCredentialsDto>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    const remembered = readRememberedEmail();
    if (remembered) {
      form.setValue("email", remembered, { shouldDirty: false });
      setPreferPasswordFocus(true);
      window.setTimeout(() => form.setFocus("password"), 80);
    }
    router.prefetch("/dashboard");
  }, [form, router]);

  const submitting = form.formState.isSubmitting || success;

  async function onSubmit(values: LoginCredentialsDto) {
    setFormError(null);
    resetAttendance();
    const res = await signInWithCredentials(values);
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
    rememberEmail(values.email);
    setSuccess(true);
    toast.success(t("auth.welcomeBack"), { duration: 1600 });
    try {
      await flushSessionPersist();
    } catch {
      /* still navigate — in-memory session is already applied */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 220));
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
    preferPasswordFocus,
    onSubmit,
    onPasswordKeyEvent,
  };
}
