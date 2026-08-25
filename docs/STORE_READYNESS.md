# ROOTK mobile — store readiness

## Fixed in code

- Privacy / Terms / Account deletion / Support / App review:
  - https://system.rootk-eg.com/privacy
  - https://system.rootk-eg.com/terms
  - https://system.rootk-eg.com/account-deletion
  - https://system.rootk-eg.com/support ← **App Store Support URL**
  - https://system.rootk-eg.com/app-review
- Login + Settings legal links
- Offline native shell (branded)
- Android: location + **READ_CONTACTS only** (WRITE removed; plugin patched), cleartext blocked, network security, backup rules, edge-to-edge, SplashScreen theme, tightened FileProvider
- iOS: location usage, encryption flag, PrivacyInfo (incl. phone), branded LaunchScreen, **RGB App Icon (no alpha)**, PRODUCT_NAME=ROOTK
- `patches/@capacitor-community+contacts+7.2.0.patch` — contacts permission alias is READ-only
- ROOTK icons/splash: `npm run cap:icons`
- Version sync: `npm run cap:version` → `1.0.0` / `10000`
- Release sync: `npm run cap:sync:release`
- Play AAB: `npm run android:bundle:release`
- Automated checks: `npm run verify:store`

## Before uploading

1. Run checks:
   ```bash
   npm run verify:store
   npm run smoke
   npx tsc --noEmit
   ```
2. Confirm URLs return **200** (privacy, terms, support, account-deletion).
3. Create upload keystore once:
   ```bash
   cd android
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   cp keystore.properties.example keystore.properties
   ```
4. Android (requires **JDK 21** — Capacitor 7):
   ```bash
   export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
   export PATH="$JAVA_HOME/bin:$PATH"
   MOBILE_VERSION=1.0.0 CAPACITOR_SERVER_URL=https://system.rootk-eg.com npm run android:bundle:release
   ```
   Debug smoke build (no keystore):
   ```bash
   cd android && ./gradlew :app:assembleDebug
   ```
5. iOS: open `ios/App/App.xcworkspace` → set Team → Archive.
6. Console:
   - Privacy Policy → `/privacy`
   - Support URL → `/support`
   - Account deletion → `/account-deletion`
   - Review notes → `/app-review`
   - Data Safety: Location, Contacts, Account info — **no tracking**
7. Demo reviewer account in console notes (required for B2B).

## Apple 4.2

Remote WebView risk remains. Native value: contacts picker, secure storage, attendance GPS, post-call resume, offline shell. Internal distribution: ABM / Play private track if rejected.

## Never commit

- `android/keystore.properties`, `*.jks`, provisioning profiles
