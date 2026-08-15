import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell around the existing Next.js CRM.
 * Production/device builds MUST set CAPACITOR_SERVER_URL to the hosted CRM origin.
 * No default live URL — localhost must not ship in a store binary.
 */
const liveUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "systems.rootk.crm",
  appName: "ROOTK",
  webDir: "native/www",
  android: {
    allowMixedContent: Boolean(liveUrl?.startsWith("http://")),
  },
};

if (liveUrl) {
  config.server = {
    url: liveUrl,
    cleartext: liveUrl.startsWith("http://"),
  };
}

export default config;
