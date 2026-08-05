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

export function findMatchingOffice(
  point: GeoPoint,
  offices: GeofencedOffice[]
): GeoMatch | null {
  let best: GeoMatch | null = null;
  for (const office of offices) {
    const distanceMeters = haversineMeters(point, office);
    if (distanceMeters > office.radiusMeters) continue;
    if (!best || distanceMeters < best.distanceMeters) {
      best = { office, distanceMeters };
    }
  }
  return best;
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

export const DEFAULT_OFFICE_RADIUS_METERS = 200;

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
      host === "g.co"
    );
  } catch {
    return false;
  }
}

/**
 * Extract WGS84 coordinates from a Google Maps URL (or HTML/text that embeds one).
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

  const bare = raw.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (bare) return pairIfValid(bare[1], bare[2]);

  return null;
}

/**
 * Resolve a Maps URL to coordinates. Follows short-link redirects when needed.
 */
export async function resolveGoogleMapsUrl(
  input: string
): Promise<GeoPoint | null> {
  const direct = parseGoogleMapsUrl(input);
  if (direct) return direct;

  const normalized = input.trim().startsWith("http")
    ? input.trim()
    : `https://${input.trim()}`;

  try {
    const response = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ROOTK-HR/1.0; +https://rootk.systems)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const finalUrl = response.url || normalized;
    const fromFinal = parseGoogleMapsUrl(finalUrl);
    if (fromFinal) return fromFinal;

    const html = await response.text();
    return parseGoogleMapsUrl(html.slice(0, 200_000));
  } catch {
    return null;
  }
}
