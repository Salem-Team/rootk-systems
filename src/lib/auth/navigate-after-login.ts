/**
 * Post-login navigation that must never hang on Capacitor / App Router.
 */

export function navigateToAppHome(router: {
  replace: (href: string) => void;
}): void {
  router.replace("/dashboard");
  if (typeof window === "undefined") return;
  // Soft SPA navigate first; hard assign quickly if App Router stalls on native.
  window.setTimeout(() => {
    const path = window.location.pathname || "";
    if (path.includes("/login")) {
      try {
        window.location.assign("/dashboard");
      } catch {
        window.location.href = "/dashboard";
      }
    }
  }, 450);
}
