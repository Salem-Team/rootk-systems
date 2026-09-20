"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import {
  acceptMediaAttr,
  canAddMediaDraft,
  fileToMediaDraft,
  formatMediaBytes,
  revokeMediaDraftPreviews,
  type WorkTaskMediaDraft,
} from "@/lib/task-media";
import { cn } from "@/lib/utils";

export function TaskMediaPicker({
  drafts,
  onChange,
  className,
}: {
  drafts: WorkTaskMediaDraft[];
  onChange: (next: WorkTaskMediaDraft[]) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => revokeMediaDraftPreviews(drafts);
    // Only revoke on unmount of current preview set via parent updates carefully.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ingestFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    let next = [...drafts];
    for (const file of list) {
      const kindGuess = file.type.startsWith("video/") ? "video" : "image";
      if (!canAddMediaDraft(next, kindGuess === "video" ? "video" : "image")) {
        setError(t("workMedia.limitReached"));
        break;
      }
      const result = await fileToMediaDraft(file);
      if (!result.ok) {
        setError(
          result.error === "imageTooLarge"
            ? t("workMedia.imageTooLarge")
            : result.error === "videoTooLarge"
              ? t("workMedia.videoTooLarge")
              : t("workMedia.unsupported")
        );
        continue;
      }
      if (!canAddMediaDraft(next, result.draft.kind)) {
        if (result.draft.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(result.draft.previewUrl);
        }
        setError(t("workMedia.limitReached"));
        break;
      }
      next = [...next, result.draft];
    }
    onChange(next);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(localId: string) {
    const target = drafts.find((d) => d.localId === localId);
    if (target?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(drafts.filter((d) => d.localId !== localId));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void ingestFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border border-dashed px-4 py-5 transition-colors sm:rounded-xl",
          dragging
            ? "border-primary bg-primary/[0.06]"
            : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/30"
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-card text-primary shadow-sm">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold">{t("workMedia.title")}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {t("workMedia.hint")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-1 h-9 rounded-xl"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {t("workMedia.browse")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={acceptMediaAttr()}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void ingestFiles(e.target.files);
            }}
          />
        </div>
      </div>

      {error ? (
        <p className="text-[12px] font-medium text-destructive">{error}</p>
      ) : null}

      {drafts.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {drafts.map((item) => (
            <li
              key={item.localId}
              className="group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
            >
              <div className="aspect-[4/3] bg-muted/40">
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={item.previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-border/60 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-[11px] font-medium">
                    {item.kind === "video" ? (
                      <Video className="h-3 w-3 shrink-0 text-primary" />
                    ) : null}
                    <span className="truncate">{item.name}</span>
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {formatMediaBytes(item.sizeBytes)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAt(item.localId)}
                  aria-label={t("common.remove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
