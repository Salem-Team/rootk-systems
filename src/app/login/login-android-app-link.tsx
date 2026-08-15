"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import {
  androidAppLinkMode,
  fetchAndroidAppRelease,
  readDownloadedAndroidVersion,
  rememberDownloadedAndroidVersion,
  type AndroidAppLinkMode,
  type AndroidAppRelease,
} from "@/lib/app-release";
import { isNativeApp } from "@/lib/native/platform";

/** Web login CTA. Hidden in the native shell and after the current APK is downloaded. */
export function LoginAndroidAppLink() {
  const { t } = useTranslation();
  const [release, setRelease] = useState<AndroidAppRelease | null>(null);
  const [downloaded, setDownloaded] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isNativeApp()) {
      setReady(true);
      return;
    }
    setDownloaded(readDownloadedAndroidVersion());
    void fetchAndroidAppRelease()
      .then(setRelease)
      .finally(() => setReady(true));
  }, []);

  if (!ready || isNativeApp()) return null;
  const mode: AndroidAppLinkMode = androidAppLinkMode(release, downloaded);
  if (mode === "hidden" || !release) return null;

  function onDownload() {
    if (!release) return;
    rememberDownloadedAndroidVersion(release.versionCode);
  }

  return (
    <a
      href={release.url}
      download="ROOTK.apk"
      onClick={onDownload}
      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#c9d4e6] bg-white px-3 text-[13px] font-semibold text-[#082868] transition-colors hover:border-[#082868]/40 hover:bg-[#f3f6fb]"
    >
      {mode === "update" ? (
        <RefreshCw className="h-4 w-4" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      {mode === "update" ? t("auth.updateApp") : t("auth.downloadApp")}
      <span className="font-mono text-[11px] font-medium text-[#64748b]">
        {t("auth.appVersion", { version: release.versionName })}
      </span>
    </a>
  );
}
