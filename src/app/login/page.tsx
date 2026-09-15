"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LOGO_SRC } from "@/constants";
import { useSessionStore, hasActiveSession } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { easeOutExpo } from "@/lib/animations";
import { LoginBackground } from "@/app/login/login-background";
import { LoginBrandHero } from "@/app/login/login-brand-hero";
import { LoginSignInPanel } from "@/app/login/login-sign-in-panel";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const authenticated = useSessionStore((s) => s.authenticated);
  const accessToken = useSessionStore((s) => s.accessToken);
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const active = hasActiveSession({
    authenticated,
    accessToken,
    refreshToken,
  });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (hasHydrated && active) {
      router.replace("/dashboard");
    }
  }, [active, hasHydrated, router]);

  if (!hasHydrated || active) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#020814] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
        <div className="h-10 w-10 animate-pulse rounded-xl border border-white/20 bg-white/10" />
        <p className="text-xs text-[#8aa0c0]">{t("app.short")}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-[#020814] text-white">
      <LoginBackground />

      <div className="relative z-10 flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: easeOutExpo }}
          className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 md:px-10 lg:px-14"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[0.85rem] border border-white/25 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/10 sm:h-11 sm:w-11 sm:rounded-xl">
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
              className="hidden font-display text-[15px] font-extrabold tracking-[-0.02em] text-white sm:block md:text-[16px]"
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

        <main className="flex flex-1 items-start px-4 py-3 sm:items-center sm:px-5 sm:py-6 md:px-10 md:py-10 lg:px-14">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 pb-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 lg:pb-0 xl:gap-24">
            <LoginBrandHero />
            <LoginSignInPanel />
          </div>
        </main>

        <footer className="mt-auto px-4 py-3 sm:px-5 sm:py-4 md:px-10 lg:px-14">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            <div className="hidden h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.3)] sm:flex">
              <Image
                src={LOGO_SRC}
                alt={t("app.short")}
                width={32}
                height={32}
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <p className="text-center text-[10.5px] font-medium tracking-wide text-[#7f95b5] sm:text-[11px]">
              © {new Date().getFullYear()} ROOTK Systems · {t("auth.copyright")}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
