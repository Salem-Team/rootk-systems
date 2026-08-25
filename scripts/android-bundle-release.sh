#!/usr/bin/env bash
# Build a Play Store AAB. Requires android/keystore.properties (see example).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f android/keystore.properties ]]; then
  echo "Missing android/keystore.properties — copy keystore.properties.example and fill signing values."
  exit 1
fi

export CAPACITOR_SERVER_URL="${CAPACITOR_SERVER_URL:-https://system.rootk-eg.com}"
export CAPACITOR_STORE_BUILD=1
export MOBILE_VERSION="${MOBILE_VERSION:-1.0.0}"

npm run cap:icons
node scripts/sync-mobile-version.mjs
node scripts/cap-sync-release.mjs

cd android
./gradlew clean bundleRelease

AAB="app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$AAB" ]]; then
  echo "AAB ready: android/$AAB"
else
  echo "Build finished but AAB not found at $AAB"
  exit 1
fi
