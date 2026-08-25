#!/usr/bin/env node
/**
 * Store-safe Capacitor sync.
 * Requires CAPACITOR_SERVER_URL as https://… (no localhost / http).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = (process.env.CAPACITOR_SERVER_URL || "").trim();
const fallback = "https://system.rootk-eg.com";
const liveUrl = raw || fallback;

function fail(message) {
  console.error(`[cap:sync:release] ${message}`);
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(liveUrl);
} catch {
  fail(`Invalid CAPACITOR_SERVER_URL: ${liveUrl}`);
}

if (parsed.protocol !== "https:") {
  fail("Store builds require https:// CAPACITOR_SERVER_URL.");
}

const host = parsed.hostname.toLowerCase();
if (
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "0.0.0.0" ||
  host.endsWith(".local")
) {
  fail("Store builds must not use localhost or .local hosts.");
}

process.env.CAPACITOR_SERVER_URL = liveUrl.replace(/\/$/, "");
process.env.CAPACITOR_STORE_BUILD = "1";

const wwwLogo = path.join(root, "native/www/rootk-logo.png");
const publicLogo = path.join(root, "public/rootk-logo.png");
if (!existsSync(wwwLogo) && existsSync(publicLogo)) {
  copyFileSync(publicLogo, wwwLogo);
}

console.log(`[cap:sync:release] syncing against ${process.env.CAPACITOR_SERVER_URL}`);

const result = spawnSync("npx", ["cap", "sync"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("[cap:sync:release] done");
