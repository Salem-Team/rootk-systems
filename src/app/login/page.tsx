"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LOGO_SRC } from "@/constants";
import { useSessionStore, hasActiveSession } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { navigateToAppHome } from "@/lib/auth/navigate-after-login";
import { isNativeApp } from "@/lib/native/platform";

const RECOVER_TIMEOUT_MS = 2_500;

const LoginBackground = dynamic(
  () =>
    import("@/app/login/login-background").then((m) => m.LoginBackground),
  { ssr: false }
);
const LoginBrandHero = dynamic(
  () =>
    import("@/app/login/login-brand-hero").then((m) => m.LoginBrandHero),
  {
    loading: () => (
      <div className="hidden min-h-[12rem] lg:block" aria-hidden />
    ),
  }
);
const LoginSignInPanel = dynamic(
  () =>
    import("@/app/login/login-sign-in-panel").then((m) => m.LoginSignInPanel),
  {
    loading: () => (
      <div className="h-[28rem] animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
    ),
  }
);

function nativeHasStoredSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("rootk-session");
    if (!raw) return false;
    return raw.includes("accessToken") || raw.includes("refreshToken");
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const active = useSessionStore((s) =>
    hasActiveSession({
      authenticated: s.authenticated,
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
    })
  );
  const [recovering, setRecovering] = useState(
    () => isNativeApp() && nativeHasStoredSessionHint()
  );

  useEffect(() => {
    if (hasHydrated) return;
    const id = window.setTimeout(() => {
      if (!useSessionStore.getState().hasHydrated) {
        useSessionStore.setState({ hasHydrated: true });
      }
    }, 1_500);
    return () => window.clearTimeout(id);
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (active) {
      setRecovering(false);
      navigateToAppHome(router);
      return;
    }

    if (!isNativeApp()) {
      setRecovering(false);
      return;
    }

    const { accessToken, refreshToken } = useSessionStore.getState();
    if (!nativeHasStoredSessionHint() && !refreshToken && !accessToken) {
      setRecovering(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setRecovering(false);
    }, RECOVER_TIMEOUT_MS);

    void import("@/services/biometric-auth.service").then(
      ({ resumeStickySessionAfterBiometrics }) =>
        resumeStickySessionAfterBiometrics().then((result) => {
          if (cancelled) return;
          if (result.ok) {
            navigateToAppHome(router);
            return;
          }
          setRecovering(false);
        })
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [active, hasHydrated, router]);

  if (!hasHydrated || active || recovering) {
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
        <header className="ui-enter-up flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 md:px-10 lg:px-14">
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
          <div className="rounded-xl border border-white/10 bg-white/[0.06]">
            <LanguageSwitcher variant="full" />
          </div>
        </header>

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
