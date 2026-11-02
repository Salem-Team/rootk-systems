import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow production deploys to build into `.next-new` then atomically swap,
  // so nginx does not return 502 while Next is stopped mid-build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/app",
    "@capacitor/local-notifications",
    "@capacitor-community/contacts",
    "@aparajita/capacitor-biometric-auth",
    "capacitor-secure-storage-plugin",
  ],
};

export default nextConfig;
