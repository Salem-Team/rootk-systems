import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell around the existing Next.js CRM.
 * Production/device builds MUST set CAPACITOR_SERVER_URL to the hosted CRM origin.
 * Prefer `npm run cap:sync:release` so localhost/http cannot ship.
 */
const liveUrl = process.env.CAPACITOR_SERVER_URL?.trim();

function assertStoreSafeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid CAPACITOR_SERVER_URL: ${url}`);
  }
  const host = parsed.hostname.toLowerCase();
  const unsafeHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local");
  if (process.env.CAPACITOR_STORE_BUILD === "1") {
    if (parsed.protocol !== "https:") {
      throw new Error("Store builds require https:// CAPACITOR_SERVER_URL.");
    }
    if (unsafeHost) {
      throw new Error("Store builds must not use localhost hosts.");
    }
  }
}

if (liveUrl) {
  assertStoreSafeUrl(liveUrl);
}

const config: CapacitorConfig = {
  appId: "systems.rootk.crm",
  appName: "ROOTK",
  webDir: "native/www",
  android: {
    allowMixedContent: Boolean(liveUrl?.startsWith("http://")),
    // targetSdk 35: keep web content clear of system bars on Android 15+.
    adjustMarginsForEdgeToEdge: "auto",
  },
};

if (liveUrl) {
  config.server = {
    url: liveUrl.replace(/\/$/, ""),
    cleartext: liveUrl.startsWith("http://"),
  };
}

export default config;
