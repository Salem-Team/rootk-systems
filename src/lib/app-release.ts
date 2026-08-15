export type AndroidAppRelease = {
  versionCode: number;
  versionName: string;
  url: string;
};

const STORAGE_KEY = "rootk.android.downloadedVersionCode";

export type AndroidAppLinkMode = "download" | "update" | "hidden";

export function androidAppLinkMode(
  release: AndroidAppRelease | null,
  downloadedVersion: number | null
): AndroidAppLinkMode {
  if (!release || !Number.isFinite(release.versionCode) || release.versionCode < 1) {
    return "hidden";
  }
  if (downloadedVersion === null) return "download";
  if (downloadedVersion < release.versionCode) return "update";
  return "hidden";
}

export function readDownloadedAndroidVersion(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const n = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function rememberDownloadedAndroidVersion(versionCode: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(versionCode));
  } catch {
    /* ignore quota / private mode */
  }
}

export async function fetchAndroidAppRelease(): Promise<AndroidAppRelease | null> {
  const res = await fetch("/app-release.json", { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { android?: Partial<AndroidAppRelease> };
  const android = json?.android;
  const versionCode = Number(android?.versionCode);
  const versionName = String(android?.versionName ?? "").trim();
  const url = String(android?.url ?? "").trim();
  if (!Number.isFinite(versionCode) || versionCode < 1 || !url) return null;
  return { versionCode, versionName: versionName || String(versionCode), url };
}
