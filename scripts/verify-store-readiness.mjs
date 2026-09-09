#!/usr/bin/env node
/**
 * Store-readiness checks for Google Play / App Store packaging.
 * Run: npm run verify:store
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK  : ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel) {
  return existsSync(join(root, rel));
}

assert(exists("src/app/privacy/page.tsx"), "privacy page");
assert(exists("src/app/terms/page.tsx"), "terms page");
assert(exists("src/app/support/page.tsx"), "support page");
assert(exists("src/app/account-deletion/page.tsx"), "account-deletion page");
assert(exists("src/app/app-review/page.tsx"), "app-review page");
assert(exists("ios/App/App/PrivacyInfo.xcprivacy"), "iOS PrivacyInfo.xcprivacy");
assert(
  read("ios/App/App/PrivacyInfo.xcprivacy").includes(
    "NSPrivacyCollectedDataTypePhoneNumber",
  ),
  "PrivacyInfo declares phone number",
);
assert(
  exists("patches/@capacitor-community+contacts+7.2.0.patch"),
  "contacts READ-only patch",
);
assert(exists("android/keystore.properties.example"), "keystore example");
assert(exists("scripts/cap-sync-release.mjs"), "cap sync release script");
assert(exists("scripts/android-bundle-release.sh"), "android bundle script");
assert(exists("scripts/generate-store-icons.py"), "icon generator");
assert(exists("native/www/index.html"), "native shell");
assert(exists("native/www/rootk-logo.png"), "native shell logo");

const shell = read("native/www/index.html");
assert(!shell.includes("CAPACITOR_SERVER_URL"), "shell has no developer env text");
assert(shell.includes("system.rootk-eg.com/privacy"), "shell links privacy");
assert(shell.includes("system.rootk-eg.com/support"), "shell links support");

const manifest = read("android/app/src/main/AndroidManifest.xml");
assert(manifest.includes("ACCESS_FINE_LOCATION"), "Android fine location");
assert(manifest.includes("READ_CONTACTS"), "Android read contacts");
assert(
  !manifest.includes("WRITE_CONTACTS"),
  "Android WRITE_CONTACTS removed (Play policy)",
);
assert(manifest.includes('usesCleartextTraffic="false"'), "cleartext disabled");
assert(
  manifest.includes("network_security_config"),
  "networkSecurityConfig wired",
);
assert(
  manifest.includes("android.hardware.location") ||
    manifest.includes("android.hardware.location.gps"),
  "location uses-feature declared optional",
);

const plist = read("ios/App/App/Info.plist");
assert(plist.includes("NSLocationWhenInUseUsageDescription"), "iOS location usage");
assert(plist.includes("NSContactsUsageDescription"), "iOS contacts usage");
assert(plist.includes("ITSAppUsesNonExemptEncryption"), "iOS encryption flag");

const pkgVersion = JSON.parse(read("package.json")).version;
const verMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(pkgVersion || ""));
assert(verMatch, `package.json version semver (${pkgVersion})`);
const expectedCode =
  Number(verMatch[1]) * 10000 + Number(verMatch[2]) * 100 + Number(verMatch[3]);

const gradle = read("android/app/build.gradle");
assert(
  gradle.includes(`versionName "${pkgVersion}"`),
  `Android versionName ${pkgVersion}`,
);
assert(
  gradle.includes(`versionCode ${expectedCode}`),
  `Android versionCode ${expectedCode}`,
);
assert(gradle.includes("signingConfigs"), "Android signingConfigs present");

const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
assert(
  pbx.includes(`MARKETING_VERSION = ${pkgVersion}`),
  `iOS marketing ${pkgVersion}`,
);
assert(
  pbx.includes(`CURRENT_PROJECT_VERSION = ${expectedCode}`),
  `iOS build ${expectedCode}`,
);
assert(pbx.includes("PrivacyInfo.xcprivacy"), "PrivacyInfo in Xcode project");

const androidCap = JSON.parse(
  read("android/app/src/main/assets/capacitor.config.json"),
);
const iosCap = JSON.parse(read("ios/App/App/capacitor.config.json"));
assert(
  androidCap.server?.url === "https://system.rootk-eg.com",
  "Android synced server URL",
);
assert(
  iosCap.server?.url === "https://system.rootk-eg.com",
  "iOS synced server URL",
);
assert(androidCap.server?.cleartext === false, "Android cleartext false");
assert(
  androidCap.android?.adjustMarginsForEdgeToEdge === "auto",
  "edge-to-edge auto",
);

assert(
  !exists("android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java"),
  "Capacitor template unit test removed",
);
assert(
  !exists(
    "android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java",
  ),
  "Capacitor template instrumented test removed",
);

assert(
  read("src/app/login/login-sign-in-panel.tsx").includes("/privacy"),
  "login links privacy",
);
assert(
  read("src/components/settings/settings-security-profile.tsx").includes(
    "/account-deletion",
  ),
  "settings links account deletion",
);

if (failed > 0) {
  console.error(`\nStore readiness failed: ${failed} assertion(s)`);
  process.exit(1);
}
console.log("\nStore readiness checks passed.");
