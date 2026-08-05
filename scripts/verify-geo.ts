/**
 * Focused verification for geofence + Google Maps URL parsing.
 * Run: npx --yes tsx scripts/verify-geo.ts
 */

import {
  findMatchingOffice,
  haversineMeters,
  parseGoogleMapsUrl,
} from "../src/lib/geo";

let failed = 0;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK  : ${msg}`);
  }
}

function almostEqual(a: number, b: number, eps = 1e-4) {
  return Math.abs(a - b) <= eps;
}

function main() {
  const hq = {
    id: "loc-1",
    name: "Cairo HQ",
    latitude: 30.0075,
    longitude: 31.4913,
    radiusMeters: 250,
  };

  assert(
    haversineMeters(hq, hq) < 1,
    "haversine same point ≈ 0"
  );

  const near = { latitude: 30.0076, longitude: 31.4914 };
  const far = { latitude: 30.05, longitude: 31.55 };
  assert(
    findMatchingOffice(near, [hq])?.office.id === "loc-1",
    "near office is inside geofence"
  );
  assert(
    findMatchingOffice(far, [hq]) === null,
    "far point is outside geofence"
  );

  // 60m away with 40m GPS accuracy against 50m radius should still pass (50+40 pad capped... wait pad is min(40,75)=40 so allowed=90)
  const edge = { latitude: 30.0080, longitude: 31.4913 }; // ~55m north of HQ
  const tight = {
    id: "loc-tight",
    name: "Tight",
    latitude: 30.0075,
    longitude: 31.4913,
    radiusMeters: 50,
  };
  assert(
    findMatchingOffice(edge, [tight], 40)?.office.id === "loc-tight",
    "accuracy pad allows near-edge GPS fix"
  );
  assert(
    findMatchingOffice(edge, [tight], 0) === null,
    "without accuracy pad, edge point is outside 50m"
  );

  const fromAt = parseGoogleMapsUrl(
    "https://www.google.com/maps/place/ROOTK/@30.0075,31.4913,17z"
  );
  assert(
    fromAt &&
      almostEqual(fromAt.latitude, 30.0075) &&
      almostEqual(fromAt.longitude, 31.4913),
    "parse @lat,lng Maps URL"
  );

  const fromQ = parseGoogleMapsUrl(
    "https://www.google.com/maps?q=30.0444,31.2357"
  );
  assert(
    fromQ &&
      almostEqual(fromQ.latitude, 30.0444) &&
      almostEqual(fromQ.longitude, 31.2357),
    "parse q=lat,lng Maps URL"
  );

  const fromBang = parseGoogleMapsUrl(
    "https://www.google.com/maps/place/data=!3d29.9792!4d31.1342"
  );
  assert(
    fromBang &&
      almostEqual(fromBang.latitude, 29.9792) &&
      almostEqual(fromBang.longitude, 31.1342),
    "parse !3d!4d Maps URL"
  );

  const bare = parseGoogleMapsUrl("30.1, 31.2");
  assert(
    bare && almostEqual(bare.latitude, 30.1) && almostEqual(bare.longitude, 31.2),
    "parse bare lat,lng"
  );

  assert(parseGoogleMapsUrl("not-a-maps-link") === null, "reject junk URL");
  assert(
    parseGoogleMapsUrl("https://maps.app.goo.gl/abc123") === null,
    "short link without coords returns null (needs resolve)"
  );

  if (failed > 0) {
    console.error(`\n${failed} geo check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll geo checks passed.");
}

main();
