"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Film, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import {
  formatMediaBytes,
  labelMediaItems,
  type WorkTaskMediaItem,
} from "@/lib/task-media";
import { cn } from "@/lib/utils";
import {
  invalidateAuthMediaUrl,
  useAuthMediaUrl,
} from "@/components/work/use-auth-media-url";

function MediaThumb({
  item,
  onOpen,
}: {
  item: WorkTaskMediaItem;
  onOpen: () => void;
}) {
  const { url, loading, error } = useAuthMediaUrl(item.url);
  const [broken, setBroken] = useState(false);

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
      ) : error || broken || !url ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground">
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
          onError={() => {
            if (item.url) invalidateAuthMediaUrl(item.url);
            setBroken(true);
          }}
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
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6 text-[11px] font-medium",
          url && !error && !broken
            ? "bg-gradient-to-t from-black/65 to-transparent text-white"
            : "text-foreground/80"
        )}
      >
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
  const { url, loading, error, failure, retry } = useAuthMediaUrl(item.url);
  const [broken, setBroken] = useState(false);

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
            <p className="text-[11px] text-white/60" dir="ltr">
              {formatMediaBytes(item.sizeBytes)}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/15"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex max-h-[min(78vh,720px)] items-center justify-center bg-black">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          ) : error || broken || !url ? (
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-sm text-white/80">
                {failure === "missing"
                  ? t("workMedia.missing")
                  : t("workMedia.loadFailed")}
              </p>
              {failure === "missing" ? null : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setBroken(false);
                    retry();
                  }}
                >
                  {t("workMedia.retry")}
                </Button>
              )}
            </div>
          ) : item.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={item.name}
              className="max-h-[min(78vh,720px)] w-full object-contain"
              onError={() => {
                if (item.url) invalidateAuthMediaUrl(item.url);
                setBroken(true);
              }}
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
  hideHeader = false,
}: {
  items: WorkTaskMediaItem[];
  className?: string;
  hideHeader?: boolean;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<WorkTaskMediaItem | null>(null);
  const labeled = labelMediaItems(items);

  if (!labeled.length) return null;

  return (
    <section className={cn("space-y-2.5", className)}>
      {hideHeader ? null : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("workMedia.galleryTitle")}
          </p>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {labeled.length}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {labeled.map((item) => (
          <MediaThumb
            key={item.id}
            item={item}
            onOpen={() => setActive(item)}
          />
        ))}
      </div>
      {active && typeof document !== "undefined"
        ? createPortal(
            <MediaLightbox item={active} onClose={() => setActive(null)} />,
            document.body
          )
        : null}
    </section>
  );
}
