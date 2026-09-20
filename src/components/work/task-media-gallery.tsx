"use client";

import { useEffect, useState } from "react";
import { Film, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { isApiMode } from "@/lib/env";
import { getHttpClient } from "@/lib/http-client";
import { formatMediaBytes, type WorkTaskMediaItem } from "@/lib/task-media";
import { cn } from "@/lib/utils";

function useAuthMediaUrl(src?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(src));
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setError(false);
    setLoading(Boolean(src));
    setUrl(null);

    async function resolve() {
      if (!src) {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
        return;
      }
      if (
        src.startsWith("data:") ||
        src.startsWith("blob:") ||
        !isApiMode()
      ) {
        if (!cancelled) {
          setUrl(src);
          setLoading(false);
        }
        return;
      }
      try {
        const client = getHttpClient();
        const path = src.startsWith("/api/")
          ? src.slice(4)
          : src.startsWith("/")
            ? src
            : `/${src}`;
        const blob = await client.requestBlob(path);
        const objectUrl = URL.createObjectURL(blob);
        revoked = objectUrl;
        if (!cancelled) {
          setUrl(objectUrl);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void resolve();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  return { url, loading, error };
}

function MediaThumb({
  item,
  onOpen,
}: {
  item: WorkTaskMediaItem;
  onOpen: () => void;
}) {
  const { url, loading, error } = useAuthMediaUrl(item.url);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-muted/30 text-start shadow-sm transition hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </span>
      ) : error || !url ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          {item.kind === "video" ? (
            <Film className="h-5 w-5" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
        </span>
      ) : item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <video
          src={url}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-medium text-white">
        <span className="line-clamp-1">{item.name}</span>
      </span>
      {item.kind === "video" ? (
        <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Film className="h-3 w-3" />
          Video
        </span>
      ) : null}
    </button>
  );
}

function MediaLightbox({
  item,
  onClose,
}: {
  item: WorkTaskMediaItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { url, loading, error } = useAuthMediaUrl(item.url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {item.name}
            </p>
            <p className="text-[11px] text-white/60">
              {formatMediaBytes(item.sizeBytes)}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex max-h-[min(78vh,720px)] items-center justify-center bg-black">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          ) : error || !url ? (
            <p className="p-8 text-sm text-white/70">{t("workMedia.loadFailed")}</p>
          ) : item.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={item.name}
              className="max-h-[min(78vh,720px)] w-full object-contain"
            />
          ) : (
            <video
              src={url}
              controls
              playsInline
              className="max-h-[min(78vh,720px)] w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Professional image/video gallery for task details. */
export function TaskMediaGallery({
  items,
  className,
}: {
  items: WorkTaskMediaItem[];
  className?: string;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<WorkTaskMediaItem | null>(null);

  if (!items.length) return null;

  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("workMedia.galleryTitle")}
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {items.length}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {items.map((item) => (
          <MediaThumb
            key={item.id}
            item={item}
            onOpen={() => setActive(item)}
          />
        ))}
      </div>
      {active ? (
        <MediaLightbox item={active} onClose={() => setActive(null)} />
      ) : null}
    </section>
  );
}
