"use client";

import Image from "next/image";
import { Controller } from "react-hook-form";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAVY, LOGO_SRC } from "@/constants";
import { useLoginForm } from "@/app/login/use-login-form";
import { fadeInUp, softSpring, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { LoginAndroidAppLink } from "@/app/login/login-android-app-link";

const fieldClass =
  "h-12 border-[#c9d4e6] bg-white pe-3 ps-11 text-[15px] text-[#0a1220] shadow-none placeholder:text-[#93a0b5] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#9eb3d4] focus-visible:border-[#082868] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#082868]/12";

export function LoginSignInPanel() {
  const reduceMotion = useReducedMotion();
  const {
    t,
    isRtl,
    form,
    submitting,
    showPassword,
    setShowPassword,
    capsLockOn,
    formError,
    emailFocused,
    setEmailFocused,
    passwordFocused,
    setPasswordFocused,
    onSubmit,
    onPasswordKeyEvent,
  } = useLoginForm();

  return (
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
          <LoginAndroidAppLink />
        </div>
      </motion.div>
    </motion.section>
  );
}
