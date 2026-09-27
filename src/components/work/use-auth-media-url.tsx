"use client";

import { useEffect, useState } from "react";
import { Film, ImageIcon, Loader2 } from "lucide-react";
import { isApiMode } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { getHttpClient } from "@/lib/http-client";
import type { WorkTaskMediaKind } from "@/lib/task-media";
import { cn } from "@/lib/utils";

export type AuthMediaFailure = "missing" | "failed";

type Entry = {
  url: string | null;
  owned: boolean;
  promise: Promise<string | null> | null;
};

const cache = new Map<string, Entry>();
const MAX_CACHED = 80;

function isDirectUrl(src: string) {
  return src.startsWith("data:") || src.startsWith("blob:") || !isApiMode();
}

function apiPath(src: string) {
  if (src.startsWith("/api/")) return src.slice(4);
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function remember(src: string, entry: Entry) {
  cache.delete(src);
  cache.set(src, entry);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    const dropped = cache.get(oldest);
    cache.delete(oldest);
    if (dropped?.owned && dropped.url) URL.revokeObjectURL(dropped.url);
  }
}

function mimeFromPath(src: string): string | null {
  const path = src.split("?")[0]!.toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  return null;
}

/** Browsers hide the real type when the API streams as octet-stream. */
async function playableBlob(blob: Blob, src: string): Promise<Blob | null> {
  if (!blob.size) return null;
  const type = blob.type.toLowerCase().split(";")[0]!.trim();
  if (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/")
  ) {
    return blob;
  }
  if (type === "application/json" || type.startsWith("text/")) return null;
  const guessed = mimeFromPath(src);
  if (!guessed) return null;
  if (type && type !== "application/octet-stream") return null;
  return new Blob([await blob.arrayBuffer()], { type: guessed });
}

function loadMediaUrl(src: string): Promise<string | null> {
  if (isDirectUrl(src)) return Promise.resolve(src);
  const existing = cache.get(src);
  if (existing?.url) {
    remember(src, existing);
    return Promise.resolve(existing.url);
  }
  if (existing?.promise) return existing.promise;

  const entry: Entry = { url: null, owned: false, promise: null };
  entry.promise = getHttpClient()
    .requestBlob(apiPath(src))
    .then(async (blob) => {
      const playable = await playableBlob(blob, src);
      if (!playable) throw new Error("not media");
      const objectUrl = URL.createObjectURL(playable);
      entry.url = objectUrl;
      entry.owned = true;
      entry.promise = null;
      remember(src, entry);
      return objectUrl;
    })
    .catch((error: unknown) => {
      entry.promise = null;
      cache.delete(src);
      if (error instanceof NotFoundError) {
        throw error;
      }
      return null;
    });
  cache.set(src, entry);
  return entry.promise;
}

/** Drop a cached file so the next open downloads it again. */
export function invalidateAuthMediaUrl(src: string) {
  const entry = cache.get(src);
  if (!entry) return;
  if (entry.owned && entry.url) URL.revokeObjectURL(entry.url);
  cache.delete(src);
}

/**
 * Authenticated media URL that stays valid across repeated opens.
 * Successful downloads are cached for the session so a second view does not
 * depend on revoking and re-fetching the same blob.
 */
export function useAuthMediaUrl(src?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(src));
  const [failure, setFailure] = useState<AuthMediaFailure | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!src) {
      setUrl(null);
      setLoading(false);
      setFailure("failed");
      return;
    }
    let cancelled = false;
    const cached = cache.get(src);
    if (cached?.url || isDirectUrl(src)) {
      setUrl(cached?.url && !isDirectUrl(src) ? cached.url : src);
      setLoading(false);
      setFailure(null);
      if (cached?.url) remember(src, cached);
      if (!isDirectUrl(src)) return;
    } else {
      setUrl(null);
      setLoading(true);
      setFailure(null);
    }
    void loadMediaUrl(src)
      .then((next) => {
        if (cancelled) return;
        setUrl(next);
        setFailure(next ? null : "failed");
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setUrl(null);
        setFailure(error instanceof NotFoundError ? "missing" : "failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src, attempt]);

  return {
    url,
    loading,
    error: failure != null,
    failure,
    retry() {
      if (src) invalidateAuthMediaUrl(src);
      setAttempt((value) => value + 1);
    },
  };
}

/** Image or video preview that sends the session token on every open. */
export function AuthMediaPreview({
  src,
  kind,
  alt,
  className,
}: {
  src?: string;
  kind: WorkTaskMediaKind;
  alt: string;
  className?: string;
}) {
  const direct = !src || isDirectUrl(src);
  const authed = useAuthMediaUrl(direct ? undefined : src);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  const shown = broken ? null : direct ? src : authed.url;
  const loading = !direct && authed.loading && !broken;
  const error = broken || (!direct && (authed.error || !shown));

  if (loading) {
    return (
      <span className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </span>
    );
  }
  if (error || !shown) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        {kind === "video" ? (
          <Film className="h-5 w-5" />
        ) : (
          <ImageIcon className="h-5 w-5" />
        )}
      </span>
    );
  }
  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={shown}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
        onError={() => {
          if (src && !direct) invalidateAuthMediaUrl(src);
          setBroken(true);
        }}
      />
    );
  }
  return (
    <video
      src={shown}
      className={cn("h-full w-full object-cover", className)}
      muted
      playsInline
      preload="metadata"
    />
  );
}
