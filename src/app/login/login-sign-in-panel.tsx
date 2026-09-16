"use client";

import Image from "next/image";
import { Controller } from "react-hook-form";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Mail,
  ScanFace,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAVY, LOGO_SRC } from "@/constants";
import { useLoginForm } from "@/app/login/use-login-form";
import { fadeInUp, softSpring, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/native/platform";
import { LoginAndroidAppLink } from "@/app/login/login-android-app-link";

const fieldClass =
  "h-12 border-[#d0dae8] bg-white pe-3 ps-11 text-[16px] leading-normal text-[#0a1220] shadow-none placeholder:text-[#94a3b8] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#9eb3d4] focus-visible:border-[#082868] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#082868]/14 md:text-[15px]";

export function LoginSignInPanel() {
  const reduceMotion = useReducedMotion() || isNativeApp();
  const {
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
    onFieldPointerDown,
    rememberMe,
    setRememberMe,
    biometricReady,
    biometricBusy,
    biometricKindLabel,
    biometricIsFace,
    onBiometricLogin,
  } = useLoginForm();

  const BiometricIcon = biometricIsFace ? ScanFace : Fingerprint;

  return (
    <>
    <motion.section
      variants={reduceMotion ? undefined : staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="mx-auto w-full max-w-[400px] lg:mx-0 lg:justify-self-end"
    >
      <motion.div
        variants={reduceMotion ? undefined : fadeInUp}
        className="mb-6 flex flex-col items-center text-center lg:hidden"
      >
        <div className="mb-4 flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/30 bg-white shadow-[0_18px_44px_rgba(0,0,0,0.4)]">
          <Image
            src={LOGO_SRC}
            alt=""
            width={68}
            height={68}
            className="h-full w-full object-contain p-1.5"
            priority
          />
        </div>
        <p
          className="font-display text-[2.35rem] font-extrabold leading-none tracking-[-0.04em] text-white"
          style={{ textShadow: "0 12px 32px rgba(0,0,0,0.4)" }}
        >
          {t("app.short")}
        </p>
        <p className="mt-2 max-w-[16rem] text-[13px] leading-relaxed text-[#a8bdd8]">
          {t("auth.welcome")}
        </p>
      </motion.div>

      <motion.div
        variants={reduceMotion ? undefined : fadeInUp}
        transition={softSpring}
        className={cn(
          "relative overflow-hidden rounded-[1.65rem] border border-white/55 bg-[#f7f9fc] text-[#0a1220] shadow-[0_36px_90px_rgba(0,0,0,0.48),0_0_0_1px_rgba(8,40,104,0.05)]",
          !reduceMotion && "bg-[#f7f9fc]/97 backdrop-blur-sm"
        )}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${BRAND_NAVY}, #1a5bb8 50%, #6aa3e8)`,
          }}
        />

        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="mb-5 hidden lg:block">
            <h2 className="font-display text-[1.35rem] font-bold tracking-tight text-[#0a1220]">
              {t("auth.signIn")}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5b6b82]">
              {t("auth.welcome")}
            </p>
          </div>

          <form
            className="space-y-3.5"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="login-email"
                className="text-[12px] font-semibold tracking-wide text-[#475569]"
              >
                {t("auth.email")}
              </Label>
              <div
                className={cn(
                  "relative rounded-xl transition-shadow duration-200",
                  emailFocused && "shadow-[0_0_0_4px_rgba(8,40,104,0.1)]"
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
                      name="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      enterKeyHint="next"
                      readOnly={!emailUnlocked}
                      placeholder={t("auth.emailPlaceholder")}
                      disabled={submitting}
                      onPointerDown={() => onFieldPointerDown("email")}
                      onFocus={(event) => onFieldFocus("email", event)}
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
                <p className="text-[12px] text-rose-600">
                  {form.formState.errors.email.message === "invalid"
                    ? t("auth.emailInvalid")
                    : t("auth.emailRequired")}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="login-password"
                className="text-[12px] font-semibold tracking-wide text-[#475569]"
              >
                {t("auth.password")}
              </Label>
              <div
                className={cn(
                  "relative rounded-xl transition-shadow duration-200",
                  passwordFocused && "shadow-[0_0_0_4px_rgba(8,40,104,0.1)]"
                )}
              >
                <LockKeyhole
                  className={cn(
                    "pointer-events-none absolute start-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors",
                    passwordFocused ? "text-[#082868]" : "text-[#8494ab]"
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
                      name="password"
                      autoComplete="current-password"
                      enterKeyHint="go"
                      readOnly={!passwordUnlocked}
                      placeholder={t("auth.passwordPlaceholder")}
                      disabled={submitting}
                      onPointerDown={() => onFieldPointerDown("password")}
                      onKeyDown={onPasswordKeyEvent}
                      onKeyUp={onPasswordKeyEvent}
                      onFocus={(event) => onFieldFocus("password", event)}
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
                  className="absolute end-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#8494ab] transition-colors hover:bg-[#e8eef7] hover:text-[#082868] active:bg-[#dce6f4]"
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
                <p className="text-[12px] text-amber-700">{t("auth.capsLockOn")}</p>
              ) : null}
              {form.formState.errors.password ? (
                <p className="text-[12px] text-rose-600">
                  {form.formState.errors.password.message === "too_short"
                    ? t("auth.passwordTooShort")
                    : t("auth.passwordRequired")}
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 transition-colors hover:border-[#c5d4ea] hover:bg-white">
              <input
                type="checkbox"
                checked={rememberMe}
                disabled={submitting}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-[#9eb3d4] text-[#082868] accent-[#082868] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082868]/30"
              />
              <span className="text-[13px] font-semibold text-[#0a1220]">
                {t("auth.rememberMe")}
              </span>
            </label>

            <AnimatePresence>
              {formError ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    x: reduceMotion ? 0 : [0, -4, 4, -2, 2, 0],
                  }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-rose-700"
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
                reduceMotion || submitting ? undefined : { scale: 0.985 }
              }
              className="pt-1.5"
            >
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                aria-busy={submitting}
                className={cn(
                  "h-12 w-full gap-2 rounded-xl text-[15px] font-semibold text-white shadow-[0_14px_32px_rgba(8,40,104,0.38)] transition-colors",
                  success
                    ? "bg-emerald-600 hover:bg-emerald-600"
                    : "bg-[#082868] hover:bg-[#0a327c] active:bg-[#071f52]"
                )}
              >
                {success ? (
                  <Check className="h-4 w-4" />
                ) : submitting && !biometricBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {success
                  ? t("auth.enteringWorkspace")
                  : submitting && !biometricBusy
                    ? t("auth.signingIn")
                    : t("auth.signIn")}
                {!submitting && !success ? (
                  <ArrowRight
                    className={cn("h-4 w-4", isRtl && "rotate-180")}
                  />
                ) : null}
              </Button>
            </motion.div>

            {biometricReady ? (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#e2e8f0]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    {t("auth.biometric.orDivider")}
                  </span>
                  <div className="h-px flex-1 bg-[#e2e8f0]" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={submitting}
                  aria-busy={biometricBusy}
                  onClick={() => void onBiometricLogin()}
                  className="h-12 w-full gap-2 rounded-xl border-[#c5d4ea] bg-white text-[15px] font-semibold text-[#082868] hover:bg-[#eef3fb] hover:text-[#082868]"
                >
                  {biometricBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BiometricIcon className="h-4 w-4" />
                  )}
                  {t("auth.biometric.loginWith", {
                    method: biometricKindLabel,
                  })}
                </Button>
              </div>
            ) : null}
          </form>

          <LoginAndroidAppLink />

          <div className="mt-5 space-y-2.5 border-t border-[#e2e8f0] pt-4">
            <p className="text-center text-[11px] leading-relaxed text-[#64748b]">
              {t("auth.legalHint")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-semibold">
              <a
                href="/privacy"
                className="text-[#082868] underline-offset-2 hover:underline"
              >
                {t("auth.privacy")}
              </a>
              <a
                href="/terms"
                className="text-[#082868] underline-offset-2 hover:underline"
              >
                {t("auth.terms")}
              </a>
              <a
                href="/support"
                className="text-[#082868] underline-offset-2 hover:underline"
              >
                {t("auth.support")}
              </a>
              <a
                href="/account-deletion"
                className="text-[#082868] underline-offset-2 hover:underline"
              >
                {t("auth.accountDeletion")}
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.section>
    </>
  );
}
