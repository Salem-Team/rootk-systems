import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
