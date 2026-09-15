/**
 * Native biometrics (fingerprint / Face ID) via @aparajita/capacitor-biometric-auth.
 * Web always reports unavailable — no-op outside Capacitor shells.
 */

import { isNativeApp } from "@/lib/native/platform";

export type BiometryKind =
  | "none"
  | "fingerprint"
  | "face"
  | "iris"
  | "unknown";

export type BiometryAvailability = {
  available: boolean;
  kind: BiometryKind;
  deviceSecure: boolean;
  reason: string;
};

export type BiometricAuthResult =
  | { ok: true }
  | { ok: false; cancelled: boolean; message: string };

function mapKind(type: number): BiometryKind {
  switch (type) {
    case 1: // touchId
    case 3: // fingerprintAuthentication
      return "fingerprint";
    case 2: // faceId
    case 4: // faceAuthentication
      return "face";
    case 5: // irisAuthentication
      return "iris";
    case 0:
      return "none";
    default:
      return "unknown";
  }
}

export async function getBiometryAvailability(): Promise<BiometryAvailability> {
  if (!isNativeApp()) {
    return {
      available: false,
      kind: "none",
      deviceSecure: false,
      reason: "web",
    };
  }
  try {
    const { BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    const info = await BiometricAuth.checkBiometry();
    return {
      available: Boolean(info.isAvailable),
      kind: mapKind(info.biometryType as number),
      deviceSecure: Boolean(info.deviceIsSecure),
      reason: info.reason || String(info.code || ""),
    };
  } catch (error) {
    return {
      available: false,
      kind: "none",
      deviceSecure: false,
      reason: error instanceof Error ? error.message : "unavailable",
    };
  }
}

export async function authenticateWithBiometrics(options: {
  reason: string;
  cancelTitle?: string;
  title?: string;
  subtitle?: string;
}): Promise<BiometricAuthResult> {
  if (!isNativeApp()) {
    return { ok: false, cancelled: false, message: "web" };
  }
  try {
    const { BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    await BiometricAuth.authenticate({
      reason: options.reason,
      cancelTitle: options.cancelTitle,
      androidTitle: options.title,
      androidSubtitle: options.subtitle,
      allowDeviceCredential: true,
      androidConfirmationRequired: false,
    });
    return { ok: true };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    const cancelled =
      code === "userCancel" ||
      code === "appCancel" ||
      code === "systemCancel" ||
      code === "userFallback";
    const message =
      error instanceof Error ? error.message : code || "authenticationFailed";
    return { ok: false, cancelled, message };
  }
}
