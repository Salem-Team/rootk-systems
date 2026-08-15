import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/app",
    "@capacitor-community/contacts",
    "capacitor-secure-storage-plugin",
  ],
};

export default nextConfig;
