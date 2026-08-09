import type {
  AdPlatform,
  AdType,
  AdValidationStatus,
  UrlInspectionResult,
} from "@/types/organic-ads";

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.watch",
]);

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "m.tiktok.com",
]);

const LINKEDIN_HOSTS = new Set([
  "linkedin.com",
  "www.linkedin.com",
  "m.linkedin.com",
]);

function stripWww(host: string): string {
  return host.toLowerCase();
}

function safeParseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

/** Normalize URL for exact-duplicate comparison. */
export function normalizeAdUrl(raw: string): string {
  const parsed = safeParseUrl(raw);
  if (!parsed) return raw.trim().toLowerCase();

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

  const dropParams = [
    "fbclid",
    "igshid",
    "igsh",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "si",
    "ref",
    "refsrc",
  ];
  for (const key of dropParams) {
    parsed.searchParams.delete(key);
  }

  let path = parsed.pathname.replace(/\/+$/, "") || "/";
  // Facebook mobile → desktop path aliases
  path = path.replace(/^\/story\.php$/i, "/story.php");

  const qs = parsed.searchParams.toString();
  return `${parsed.protocol}//${parsed.hostname}${path}${qs ? `?${qs}` : ""}`;
}

export function detectPlatform(url: URL): AdPlatform {
  const host = stripWww(url.hostname);
  if (FACEBOOK_HOSTS.has(host) || host.endsWith(".facebook.com")) {
    return "facebook";
  }
  if (INSTAGRAM_HOSTS.has(host)) return "instagram";
  if (TIKTOK_HOSTS.has(host) || host.endsWith(".tiktok.com")) return "tiktok";
  if (LINKEDIN_HOSTS.has(host) || host.endsWith(".linkedin.com")) {
    return "linkedin";
  }
  if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
  return "other";
}

export function detectAdType(url: URL, platform: AdPlatform): AdType {
  const path = url.pathname.toLowerCase();

  if (platform === "instagram") {
    if (path.includes("/reel/") || path.includes("/reels/")) return "reel";
    if (path.includes("/stories/")) return "story";
    if (path.includes("/p/") || path.includes("/tv/")) return "post";
    return "unknown";
  }

  if (platform === "tiktok") {
    if (path.includes("/video/")) return "video";
    if (path.includes("/photo/")) return "post";
    return "unknown";
  }

  if (platform === "facebook") {
    if (path.includes("/reel/") || path.includes("/reels/")) return "reel";
    if (path.includes("/videos/") || path.includes("/watch")) return "video";
    if (path.includes("/stories/") || path.includes("/story.php")) return "story";
    if (path.includes("/posts/") || path.includes("/permalink")) return "post";
    return "unknown";
  }

  if (platform === "linkedin") {
    if (path.includes("/posts/") || path.includes("/feed/update")) return "post";
    if (path.includes("/video/")) return "video";
    return "unknown";
  }

  return "unknown";
}

/** Extract a stable platform content id when the URL shape is known. */
export function extractExternalId(
  url: URL,
  platform: AdPlatform
): string | null {
  const path = url.pathname;

  if (platform === "instagram") {
    const m =
      path.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i) ||
      path.match(/\/stories\/[^/]+\/(\d+)/i);
    return m?.[2] ?? m?.[1] ?? null;
  }

  if (platform === "tiktok") {
    const m = path.match(/\/video\/(\d+)/i);
    return m?.[1] ?? null;
  }

  if (platform === "facebook") {
    const story = url.searchParams.get("story_fbid");
    if (story) return story;
    const watchId = url.searchParams.get("v");
    if (watchId) return watchId;
    const m =
      path.match(/\/(posts|videos|reel|reels)\/(\d+)/i) ||
      path.match(/\/(\d{8,})\//);
    return m?.[2] ?? m?.[1] ?? null;
  }

  if (platform === "linkedin") {
    const m = path.match(/\/(posts|feed\/update)\/([^/?#]+)/i);
    return m?.[2] ?? null;
  }

  return null;
}

function validationFor(
  platform: AdPlatform,
  externalId: string | null
): { status: AdValidationStatus; message: string } {
  if (platform === "unknown") {
    return {
      status: "invalid",
      message: "This link is invalid or unsupported",
    };
  }
  if (platform === "other") {
    return {
      status: "unsupported",
      message: "This platform is not currently supported",
    };
  }
  // Client-side V1 cannot verify remote accessibility — mark valid when shape is OK.
  if (!externalId && platform !== "linkedin") {
    return {
      status: "broken",
      message: "This advertisement could not be verified",
    };
  }
  return {
    status: "valid",
    message: "Valid advertisement link",
  };
}

/** Inspect a pasted URL — platform, type, canonical form, validation. */
export function inspectAdUrl(raw: string): Omit<
  UrlInspectionResult,
  "duplicate" | "potentialDuplicates"
> {
  const parsed = safeParseUrl(raw);
  if (!parsed) {
    return {
      url: raw.trim(),
      canonicalUrl: raw.trim(),
      platform: "unknown",
      adType: "unknown",
      externalId: null,
      validationStatus: "invalid",
      validationMessage: "This link is invalid or unsupported",
    };
  }

  const platform = detectPlatform(parsed);
  const adType = detectAdType(parsed, platform);
  const externalId = extractExternalId(parsed, platform);
  const canonicalUrl = normalizeAdUrl(raw);
  const { status, message } = validationFor(platform, externalId);

  return {
    url: raw.trim(),
    canonicalUrl,
    platform,
    adType,
    externalId,
    validationStatus: status,
    validationMessage: message,
  };
}

export function platformLabel(platform: AdPlatform): string {
  const labels: Record<AdPlatform, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    other: "Other",
    unknown: "Unknown",
  };
  return labels[platform];
}

export function adTypeLabel(adType: AdType): string {
  const labels: Record<AdType, string> = {
    post: "Post",
    reel: "Reel",
    video: "Video",
    story: "Story",
    profile_post: "Profile post",
    other: "Other",
    unknown: "Unknown",
  };
  return labels[adType];
}
