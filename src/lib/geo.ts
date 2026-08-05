/** Earth mean radius in meters (WGS84 approximation). */
const EARTH_RADIUS_M = 6_371_000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeofencedOffice extends GeoPoint {
  id: string;
  name?: string;
  radiusMeters: number;
}

export interface GeoMatch {
  office: GeofencedOffice;
  distanceMeters: number;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinGeofence(
  point: GeoPoint,
  office: GeofencedOffice
): boolean {
  return haversineMeters(point, office) <= office.radiusMeters;
}

/** Nearest office within its (accuracy-aware) radius, or null if outside every geofence. */
export function findMatchingOffice(
  point: GeoPoint,
  offices: GeofencedOffice[],
  accuracyMeters = 0
): GeoMatch | null {
  let best: GeoMatch | null = null;
  for (const office of offices) {
    const distanceMeters = haversineMeters(point, office);
    const allowed = effectiveGeofenceRadius(office.radiusMeters, accuracyMeters);
    if (distanceMeters > allowed) continue;
    if (!best || distanceMeters < best.distanceMeters) {
      best = { office, distanceMeters };
    }
  }
  return best;
}

/** Nearest office regardless of radius — used for outside-geofence diagnostics. */
export function findNearestOffice(
  point: GeoPoint,
  offices: GeofencedOffice[]
): GeoMatch | null {
  let best: GeoMatch | null = null;
  for (const office of offices) {
    const distanceMeters = haversineMeters(point, office);
    if (!best || distanceMeters < best.distanceMeters) {
      best = { office, distanceMeters };
    }
  }
  return best;
}

/**
 * Expand the configured radius by GPS uncertainty (capped) so phones with
 * typical urban accuracy (20–80m) are not falsely rejected at the office edge.
 */
export function effectiveGeofenceRadius(
  radiusMeters: number,
  accuracyMeters = 0
): number {
  const accuracyPad = Math.min(Math.max(accuracyMeters, 0), 75);
  return Math.max(radiusMeters, 0) + accuracyPad;
}

export function isValidGeoPoint(
  value: unknown
): value is GeoPoint & { accuracy?: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.latitude === "number" &&
    Number.isFinite(v.latitude) &&
    v.latitude >= -90 &&
    v.latitude <= 90 &&
    typeof v.longitude === "number" &&
    Number.isFinite(v.longitude) &&
    v.longitude >= -180 &&
    v.longitude <= 180
  );
}

export type BrowserGeoCoords = GeoPoint & { accuracy?: number };

export const DEFAULT_OFFICE_RADIUS_METERS = 200;
export const MIN_OFFICE_RADIUS_METERS = 100;

function asFiniteCoord(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pairIfValid(latRaw: string, lngRaw: string): GeoPoint | null {
  const latitude = asFiniteCoord(latRaw);
  const longitude = asFiniteCoord(lngRaw);
  if (
    latitude == null ||
    longitude == null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

/** True for share short-links that usually need a redirect to reveal coordinates. */
export function isGoogleMapsShortUrl(input: string): boolean {
  try {
    const normalized = input.trim().startsWith("http")
      ? input.trim()
      : `https://${input.trim()}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "g.co" ||
      (host === "google.com" && url.pathname.startsWith("/maps/"))
    );
  } catch {
    return false;
  }
}

/**
 * Extract WGS84 coordinates from a Google Maps URL (or HTML/text that embeds one).
 * Supports @lat,lng · !3d!4d · q/query/ll/destination · place pin patterns.
 */
export function parseGoogleMapsUrl(input: string): GeoPoint | null {
  const raw = input.trim();
  if (!raw) return null;

  const bang = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bang) {
    const point = pairIfValid(bang[1], bang[2]);
    if (point) return point;
  }

  const at = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const point = pairIfValid(at[1], at[2]);
    if (point) return point;
  }

  let url: URL | null = null;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    url = null;
  }

  if (url) {
    for (const key of ["q", "query", "ll", "destination", "center", "daddr"]) {
      const value = url.searchParams.get(key);
      if (!value) continue;
      const decoded = decodeURIComponent(value.replace(/\+/g, " "));
      const match = decoded.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (match) {
        const point = pairIfValid(match[1], match[2]);
        if (point) return point;
      }
    }

    const pathPlace = url.pathname.match(
      /\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:\/|$)/
    );
    if (pathPlace) {
      const point = pairIfValid(pathPlace[1], pathPlace[2]);
      if (point) return point;
    }
  }

  // Bare "lat,lng" pasted from Maps share sheet.
  const bare = raw.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (bare) return pairIfValid(bare[1], bare[2]);

  return null;
}

/**
 * Read the device GPS. Rejects with a stable message string for UI mapping.
 */
export function getBrowserLocation(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20_000,
    maximumAge: 15_000,
  }
): Promise<BrowserGeoCoords> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Location unavailable"));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy:
            typeof pos.coords.accuracy === "number"
              ? pos.coords.accuracy
              : undefined,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied"));
          return;
        }
        reject(new Error("Location unavailable"));
      },
      options
    );
  });
}
