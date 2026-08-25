#!/usr/bin/env node
/**
 * Align Android + iOS marketing versions with package.json (store builds).
 * versionCode / CURRENT_PROJECT_VERSION = major*10000 + minor*100 + patch
 * Example: 1.0.0 → 10000, 1.2.3 → 10203
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const raw = String(process.env.MOBILE_VERSION || pkg.version || "1.0.0").trim();
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(raw);

if (!match) {
  console.error(`[sync-mobile-version] Invalid version: ${raw}`);
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]);
const versionName = `${major}.${minor}.${patch}`;
const versionCode = major * 10000 + minor * 100 + patch;

const gradlePath = path.join(root, "android/app/build.gradle");
let gradle = readFileSync(gradlePath, "utf8");
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
writeFileSync(gradlePath, gradle);

const pbxPath = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");
let pbx = readFileSync(pbxPath, "utf8");
pbx = pbx.replace(
  /CURRENT_PROJECT_VERSION = [^;]+;/g,
  `CURRENT_PROJECT_VERSION = ${versionCode};`,
);
pbx = pbx.replace(
  /MARKETING_VERSION = [^;]+;/g,
  `MARKETING_VERSION = ${versionName};`,
);
writeFileSync(pbxPath, pbx);

console.log(
  `[sync-mobile-version] ${versionName} (code ${versionCode}) → Android + iOS`,
);
