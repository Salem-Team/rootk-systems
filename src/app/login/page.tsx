"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND_NAVY, LOGO_SRC } from "@/constants";
import { useSessionStore } from "@/stores/session-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { signInWithCredentials } from "@/services/auth.service";
import {
  loginCredentialsSchema,
  type LoginCredentialsDto,
} from "@/schemas/auth.schema";
import { useTranslation } from "@/hooks/use-translation";
import {
  easeOutExpo,
  fadeInUp,
  softSpring,
  staggerContainer,
} from "@/lib/animations";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const authenticated = useSessionStore((s) => s.authenticated);
  const resetAttendance = useAttendanceStore((s) => s.reset);
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const form = useForm<LoginCredentialsDto>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const submitting = form.formState.isSubmitting;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, hydrated, router]);

  async function onSubmit(values: LoginCredentialsDto) {
    setFormError(null);
    resetAttendance();
    const res = await signInWithCredentials(values);
    if (!res.success) {
      const message = t("auth.invalidCredentials");
      setFormError(message);
      toast.error(message);
      form.setFocus("password");
      return;
    }
    toast.success(t("auth.welcomeBack"));
    router.replace("/dashboard");
  }

  function onPasswordKeyEvent(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  const fieldClass =
    "h-12 border-[#c9d4e6] bg-white pe-3 ps-11 text-[15px] text-[#0a1220] shadow-none placeholder:text-[#93a0b5] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#9eb3d4] focus-visible:border-[#082868] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#082868]/12";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020814] text-white">
      {/* Full-bleed brand atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 100% 80% at 15% 20%, rgba(40, 92, 180, 0.45), transparent 55%),
            radial-gradient(ellipse 80% 70% at 90% 85%, rgba(8, 40, 104, 0.9), transparent 55%),
            radial-gradient(ellipse 50% 40% at 55% 40%, rgba(140, 185, 240, 0.08), transparent 70%),
            linear-gradient(165deg, #01060f 0%, #041428 28%, ${BRAND_NAVY} 58%, #061830 100%)
          `,
        }}
      />

      {!reduceMotion ? (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -start-32 top-[-10%] h-[36rem] w-[36rem] rounded-full bg-[#2a6cc4]/20 blur-[120px]"
            animate={{ y: [0, 36, 0], x: [0, 18, 0], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -end-24 bottom-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#0a327c]/55 blur-[110px]"
            animate={{ y: [0, -30, 0], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute start-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-[#7eb0ef]/10 blur-[90px]"
            animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}

      {/* Fine grain + vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(1,4,12,0.72)_100%)]"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: easeOutExpo }}
          className="flex items-center justify-between px-5 py-5 md:px-10 lg:px-14"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
              <Image
                src={LOGO_SRC}
                alt={t("app.short")}
                width={44}
                height={44}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>
            <p
              className="text-[15px] font-extrabold tracking-[-0.02em] text-white md:text-[16px]"
              style={{
                textShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              {t("app.short")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-md">
            <LanguageSwitcher variant="full" />
          </div>
        </motion.header>

        <main className="flex flex-1 items-center px-5 py-6 md:px-10 md:py-10 lg:px-14">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 xl:gap-24">
            {/* Brand stage — hero lockup for large screens */}
            <motion.section
              variants={reduceMotion ? undefined : staggerContainer}
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              className="relative hidden lg:flex lg:min-h-[28rem] lg:items-center"
              aria-label={t("app.short")}
            >
              {/* Soft brand glow behind lockup */}
              <div
                aria-hidden
                className="pointer-events-none absolute start-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4d8fdc]/18 blur-[90px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute start-[42%] top-[48%] h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-[60px]"
              />

              <div
                dir="ltr"
                className="relative flex flex-col items-start gap-7 xl:gap-8"
              >
                <motion.div
                  variants={reduceMotion ? undefined : fadeInUp}
                  className="relative"
                >
                  {/* Outer ring */}
                  <div
                    aria-hidden
                    className="absolute -inset-4 rounded-[2rem] border border-white/[0.08]"
                  />
                  <div
                    aria-hidden
                    className="absolute -inset-8 rounded-[2.5rem] border border-white/[0.04]"
                  />

                  <motion.div
                    animate={
                      reduceMotion
                        ? undefined
                        : { y: [0, -6, 0], rotate: [0, -1.2, 1.2, 0] }
                    }
                    transition={{
                      duration: 9,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative flex h-[6.25rem] w-[6.25rem] items-center justify-center overflow-hidden rounded-[1.55rem] border border-white/30 bg-white shadow-[0_28px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.12)_inset] xl:h-[7rem] xl:w-[7rem] xl:rounded-[1.75rem]"
                  >
                    <Image
                      src={LOGO_SRC}
                      alt=""
                      width={112}
                      height={112}
                      className="h-full w-full object-contain p-2"
                      priority
                    />
                  </motion.div>
                </motion.div>

                <motion.div
                  variants={reduceMotion ? undefined : fadeInUp}
                  className="relative"
                >
                  <h1
                    className="font-[family-name:var(--font-display)] text-[clamp(4.75rem,9.2vw,7.5rem)] font-extrabold leading-[0.86] tracking-[-0.055em]"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, #ffffff 0%, #e8f1ff 38%, #b7d0f2 72%, #7ea8dc 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      filter:
                        "drop-shadow(0 18px 40px rgba(0,0,0,0.35)) drop-shadow(0 2px 0 rgba(255,255,255,0.08))",
                    }}
                  >
                    {t("app.short")}
                  </h1>

                  {/* Brand underline accent */}
                  <motion.div
                    aria-hidden
                    initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{
                      delay: 0.35,
                      duration: 0.7,
                      ease: easeOutExpo,
                    }}
                    className="mt-5 h-[3px] w-[min(100%,14rem)] origin-left rounded-full"
                    style={{
                      backgroundImage: `linear-gradient(90deg, #ffffff 0%, #8fb4e4 45%, transparent 100%)`,
                    }}
                  />
                </motion.div>
              </div>
            </motion.section>

            {/* Sign-in surface */}
            <motion.section
              variants={reduceMotion ? undefined : staggerContainer}
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              className="mx-auto w-full max-w-[420px] lg:mx-0 lg:justify-self-end"
            >
              <motion.div
                variants={reduceMotion ? undefined : fadeInUp}
                className="mb-7 flex justify-center lg:hidden"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                  <Image
                    src={LOGO_SRC}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-contain p-1.5"
                    priority
                  />
                </div>
              </motion.div>

              <motion.div
                variants={reduceMotion ? undefined : fadeInUp}
                transition={softSpring}
                className="relative overflow-hidden rounded-[1.5rem] border border-white/50 bg-[#f6f8fc] text-[#0a1220] shadow-[0_40px_100px_rgba(0,0,0,0.5),0_0_0_1px_rgba(8,40,104,0.06)]"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${BRAND_NAVY}, #1a5bb8 50%, #6aa3e8)`,
                  }}
                />

                <div className="p-6 md:p-7">
                  <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit(onSubmit)}
                    noValidate
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="login-email"
                        className="text-[12.5px] font-semibold text-[#334155]"
                      >
                        {t("auth.email")}
                      </Label>
                      <div
                        className={cn(
                          "relative rounded-xl transition-shadow duration-200",
                          emailFocused &&
                            "shadow-[0_0_0_4px_rgba(8,40,104,0.08)]"
                        )}
                      >
                        <Mail
                          className={cn(
                            "pointer-events-none absolute start-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors",
                            emailFocused ? "text-[#082868]" : "text-[#8494ab]"
                          )}
                        />
                        <Controller
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="login-email"
                              type="email"
                              autoComplete="username"
                              autoFocus
                              inputMode="email"
                              placeholder=""
                              disabled={submitting}
                              onFocus={() => setEmailFocused(true)}
                              onBlur={() => {
                                setEmailFocused(false);
                                field.onBlur();
                              }}
                              className={fieldClass}
                            />
                          )}
                        />
                      </div>
                      {form.formState.errors.email ? (
                        <p className="text-xs text-rose-600">
                          {form.formState.errors.email.message === "invalid"
                            ? t("auth.emailInvalid")
                            : t("auth.emailRequired")}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="login-password"
                        className="text-[12.5px] font-semibold text-[#334155]"
                      >
                        {t("auth.password")}
                      </Label>
                      <div
                        className={cn(
                          "relative rounded-xl transition-shadow duration-200",
                          passwordFocused &&
                            "shadow-[0_0_0_4px_rgba(8,40,104,0.08)]"
                        )}
                      >
                        <LockKeyhole
                          className={cn(
                            "pointer-events-none absolute start-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors",
                            passwordFocused
                              ? "text-[#082868]"
                              : "text-[#8494ab]"
                          )}
                        />
                        <Controller
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              placeholder=""
                              disabled={submitting}
                              onKeyDown={onPasswordKeyEvent}
                              onKeyUp={onPasswordKeyEvent}
                              onFocus={() => setPasswordFocused(true)}
                              onBlur={() => {
                                setPasswordFocused(false);
                                field.onBlur();
                              }}
                              className={cn(fieldClass, "pe-12")}
                            />
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#8494ab] transition-colors hover:bg-[#e8eef7] hover:text-[#082868]"
                          aria-label={
                            showPassword
                              ? t("auth.hidePassword")
                              : t("auth.showPassword")
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {capsLockOn ? (
                        <p className="text-xs text-amber-700">
                          {t("auth.capsLockOn")}
                        </p>
                      ) : null}
                      {form.formState.errors.password ? (
                        <p className="text-xs text-rose-600">
                          {form.formState.errors.password.message ===
                          "too_short"
                            ? t("auth.passwordTooShort")
                            : t("auth.passwordRequired")}
                        </p>
                      ) : null}
                    </div>

                    <AnimatePresence>
                      {formError ? (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            x: reduceMotion ? 0 : [0, -5, 5, -3, 3, 0],
                          }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.35 }}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700"
                          role="alert"
                        >
                          {formError}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>

                    <motion.div
                      whileHover={
                        reduceMotion || submitting ? undefined : { y: -1 }
                      }
                      whileTap={
                        reduceMotion || submitting
                          ? undefined
                          : { scale: 0.985 }
                      }
                      className="pt-1"
                    >
                      <Button
                        type="submit"
                        size="lg"
                        disabled={submitting}
                        aria-busy={submitting}
                        className="h-12 w-full gap-2 rounded-xl bg-[#082868] text-[15px] font-semibold text-white shadow-[0_14px_32px_rgba(8,40,104,0.38)] transition-colors hover:bg-[#0a327c]"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {submitting ? t("auth.signingIn") : t("auth.signIn")}
                        {!submitting ? (
                          <ArrowRight
                            className={cn("h-4 w-4", isRtl && "rotate-180")}
                          />
                        ) : null}
                      </Button>
                    </motion.div>
                  </form>
                </div>
              </motion.div>
            </motion.section>
          </div>
        </main>

        <footer className="px-5 py-5 md:px-10 lg:px-14">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
              <Image
                src={LOGO_SRC}
                alt={t("app.short")}
                width={32}
                height={32}
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <p className="text-center text-[11px] font-medium tracking-wide text-[#8aa0c0]">
              © {new Date().getFullYear()} ROOTK Systems · {t("auth.copyright")}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
