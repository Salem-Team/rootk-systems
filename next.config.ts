import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/app",
    "@capacitor-community/contacts",
    "@aparajita/capacitor-biometric-auth",
    "capacitor-secure-storage-plugin",
  ],
};

export default nextConfig;
