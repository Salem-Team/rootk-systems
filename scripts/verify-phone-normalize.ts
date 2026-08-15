/**
 * Authoritative phone identity tests — the four equivalent Egyptian numbers
 * must resolve to the same E.164 value.
 *
 * Run: npx tsx scripts/verify-phone-normalize.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canonicalPhoneOrNull,
  formatEgyptianNationalDisplay,
  normalizeEgyptianMobile,
} from "../shared/phone-normalize";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

const equivalents = [
  "01012345678",
  "+201012345678",
  "00201012345678",
  "201012345678",
  "010 1234 5678",
  "010-1234-5678",
  "+20 10-1234-5678",
  "+20 10 1234 5678",
  "0020 10 1234 5678",
  "(010) 1234 5678",
];

const canonical = "+201012345678";

for (const input of equivalents) {
  const result = normalizeEgyptianMobile(input);
  assert(result.ok && result.e164 === canonical, `${input} → ${canonical}`);
}

assert(
  equivalents.every((a) =>
    equivalents.every(
      (b) => canonicalPhoneOrNull(a) === canonicalPhoneOrNull(b)
    )
  ),
  "all equivalent representations match each other"
);

assert(
  formatEgyptianNationalDisplay("+201012345678") === "010 1234 5678",
  "display is Egyptian national grouping"
);

assert(!normalizeEgyptianMobile("").ok, "empty rejected");
assert(!normalizeEgyptianMobile("   ").ok, "whitespace-only rejected");
assert(!normalizeEgyptianMobile(null).ok, "null rejected");
assert(!normalizeEgyptianMobile("12345").ok, "too short rejected");
assert(!normalizeEgyptianMobile("010123456789").ok, "too long not truncated into a valid number");
assert(!normalizeEgyptianMobile("02012345678").ok, "landline-like not silently made mobile");
assert(!normalizeEgyptianMobile("+9901012345678").ok, "wrong country rejected");
assert(!normalizeEgyptianMobile("abc").ok, "letters rejected");
assert(!normalizeEgyptianMobile("+20").ok, "country only rejected");
assert(normalizeEgyptianMobile("٠١٠١٢٣٤٥٦٧٨").ok, "arabic-indic digits accepted");

assert(normalizeEgyptianMobile("  01012345678  ").ok && (normalizeEgyptianMobile("  01012345678  ") as { e164: string }).e164 === canonical, "trimmed spaces");
assert(normalizeEgyptianMobile("00 20 1012-345678").ok && (normalizeEgyptianMobile("00 20 1012-345678") as { e164: string }).e164 === canonical, "0020 with spaces and dash");
assert(!normalizeEgyptianMobile("01312345678").ok, "013 landline-like rejected");
assert(!normalizeEgyptianMobile("01612345678").ok, "016 prefix rejected");
assert(!normalizeEgyptianMobile("++201012345678").ok, "double plus rejected");
assert(!normalizeEgyptianMobile("+20101234567").ok, "too-short E.164 rejected");
assert(!normalizeEgyptianMobile("0020101234567").ok, "truncated international rejected");
assert(!normalizeEgyptianMobile("0201012345678").ok, "malformed 020 prefix not silently fixed");

const nsn10 = normalizeEgyptianMobile("1012345678");
assert(nsn10.ok && nsn10.e164 === canonical, "10-digit NSN 1012345678 canonicalizes");

const shared = readFileSync(join("shared", "phone-normalize.ts"), "utf8");
const backend = readFileSync(
  join("backend", "src", "lib", "phone-normalize.ts"),
  "utf8"
);
assert(shared === backend, "backend copy matches shared source of truth");

if (failed) {
  console.error(`\n${failed} phone-normalize checks failed`);
  process.exit(1);
}
console.log("\nAll phone-normalize checks passed");
