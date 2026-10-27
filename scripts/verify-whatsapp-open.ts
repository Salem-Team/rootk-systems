/**
 * Verifies WhatsApp open URLs force the salesperson’s app (personal vs Business)
 * on Android/iOS mobile browsers — not only inside Capacitor.
 */
import {
  buildWhatsappOpenUrl,
  resolveWhatsappPlatform,
  whatsappDigits,
} from "../src/lib/crm/open-whatsapp";

const CUSTOMER = "+201012345678";
const digits = whatsappDigits(CUSTOMER);
if (digits !== "201012345678") {
  throw new Error(`Expected digits 201012345678, got ${digits}`);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// Mobile Chrome must NOT be treated as desktop "web".
assert(
  resolveWhatsappPlatform(
    "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    "web"
  ) === "android",
  "Android Chrome UA should resolve to android"
);
assert(
  resolveWhatsappPlatform(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "web"
  ) === "ios",
  "iPhone Safari UA should resolve to ios"
);
assert(
  resolveWhatsappPlatform(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
    "web"
  ) === "web",
  "Desktop should stay web"
);

const personalAndroid = buildWhatsappOpenUrl(CUSTOMER, "whatsapp", {
  platform: "android",
});
assert(personalAndroid, "personal android url");
assert(
  personalAndroid.includes("package=com.whatsapp;") &&
    !personalAndroid.includes("package=com.whatsapp.w4b;"),
  `personal must target com.whatsapp: ${personalAndroid}`
);
assert(
  personalAndroid.includes(`phone=${digits}`),
  "personal android must include customer phone"
);
assert(
  personalAndroid.includes("S.browser_fallback_url="),
  "android intent needs browser fallback"
);

const businessAndroid = buildWhatsappOpenUrl(CUSTOMER, "business", {
  platform: "android",
});
assert(businessAndroid, "business android url");
assert(
  businessAndroid.includes("package=com.whatsapp.w4b;"),
  `business must target com.whatsapp.w4b: ${businessAndroid}`
);

const personalIos = buildWhatsappOpenUrl(CUSTOMER, "whatsapp", {
  platform: "ios",
});
assert(
  personalIos === `whatsapp://send?phone=${digits}`,
  `ios personal: ${personalIos}`
);

const businessIos = buildWhatsappOpenUrl(CUSTOMER, "business", {
  platform: "ios",
});
assert(
  businessIos === `whatsapp-business://send?phone=${digits}`,
  `ios business: ${businessIos}`
);

const desktop = buildWhatsappOpenUrl(CUSTOMER, "whatsapp", {
  platform: "web",
});
assert(
  desktop === `https://api.whatsapp.com/send?phone=${digits}`,
  `desktop: ${desktop}`
);

// Regression: selecting business must NEVER produce a bare wa.me on Android
// (that lets the OS pick company WhatsApp Business by default).
assert(
  !personalAndroid.startsWith("https://wa.me/"),
  "android personal must not be bare wa.me"
);
assert(
  !businessAndroid.startsWith("https://wa.me/"),
  "android business must not be bare wa.me"
);

console.log("verify-whatsapp-open: OK");
console.log("  android personal →", personalAndroid.slice(0, 72) + "…");
console.log("  android business →", businessAndroid.slice(0, 72) + "…");
console.log("  ios personal     →", personalIos);
console.log("  ios business     →", businessIos);
console.log("  desktop          →", desktop);
