"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardPaste, ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthMediaPreview } from "@/components/work/use-auth-media-url";
import { useTranslation } from "@/hooks/use-translation";
import {
  acceptMediaAttr,
  canAddMediaDraft,
  fileToMediaDraft,
  formatMediaBytes,
  mediaFilesFromDataTransfer,
  revokeMediaDraftPreviews,
  type WorkTaskMediaDraft,
} from "@/lib/task-media";
import { cn } from "@/lib/utils";

const pasteOwners = new Set<number>();
let focusedPasteOwner: number | null = null;
let pasteOwnerSeq = 0;
let lastGlobalPaste = { key: "", at: 0 };

function registerPasteOwner() {
  const id = ++pasteOwnerSeq;
  pasteOwners.add(id);
  focusedPasteOwner = id;
  return {
    id,
    release() {
      pasteOwners.delete(id);
      if (focusedPasteOwner === id) {
        const rest = [...pasteOwners];
        focusedPasteOwner = rest.length ? rest[rest.length - 1]! : null;
      }
    },
  };
}

export function TaskMediaPicker({
  drafts,
  onChange,
  className,
  imagesOnly = false,
}: {
  drafts: WorkTaskMediaDraft[];
  onChange: (next: WorkTaskMediaDraft[]) => void;
  className?: string;
  imagesOnly?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef(drafts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const pasteFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ownerId = useRef(0);

  draftsRef.current = drafts;

  useEffect(() => {
    const owner = registerPasteOwner();
    ownerId.current = owner.id;
    return () => {
      revokeMediaDraftPreviews(draftsRef.current);
      if (pasteFlashTimer.current) clearTimeout(pasteFlashTimer.current);
      owner.release();
    };
  }, []);

  const flashPasteSuccess = useCallback(() => {
    setPasteFlash(true);
    if (pasteFlashTimer.current) clearTimeout(pasteFlashTimer.current);
    pasteFlashTimer.current = setTimeout(() => setPasteFlash(false), 1600);
  }, []);

  const ingestFiles = useCallback(
    async (files: FileList | File[], opts?: { fromPaste?: boolean }) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setBusy(true);
      setError(null);
      let next = [...draftsRef.current];
      let added = 0;
      for (const file of list) {
        if (imagesOnly && file.type.startsWith("video/")) {
          setError(t("workMedia.imagesOnly"));
          continue;
        }
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
        added += 1;
      }
      onChange(next);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      if (opts?.fromPaste && added > 0) flashPasteSuccess();
    },
    [flashPasteSuccess, imagesOnly, onChange, t]
  );

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      // Don't steal paste from password fields / contenteditable editors unrelated to this form.
      if (
        target?.closest?.(
          "input[type='password'], [data-no-media-paste], [contenteditable='true']"
        )
      ) {
        return;
      }

      const built = mediaFilesFromDataTransfer(e.clipboardData);
      if (built.length === 0) return;
      if (pasteOwners.size > 1 && focusedPasteOwner !== ownerId.current) {
        return;
      }
      const key = built.map((file) => `${file.size}:${file.type}`).join("|");
      const now = Date.now();
      if (lastGlobalPaste.key === key && now - lastGlobalPaste.at < 600) {
        e.preventDefault();
        return;
      }
      lastGlobalPaste = { key, at: now };
      e.preventDefault();
      void ingestFiles(built, { fromPaste: true });
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ingestFiles]);

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
        tabIndex={0}
        role="group"
        aria-label={t("workMedia.title")}
        onFocus={() => {
          focusedPasteOwner = ownerId.current;
        }}
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
          const files = mediaFilesFromDataTransfer(e.dataTransfer);
          void ingestFiles(files.length ? files : Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "relative rounded-2xl border border-dashed px-4 py-5 outline-none transition-[border-color,background-color,box-shadow] duration-200 sm:rounded-xl",
          "focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/20",
          pasteFlash
            ? "border-emerald-500/70 bg-emerald-500/[0.08] shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
            : dragging
              ? "border-primary bg-primary/[0.06] shadow-[0_0_0_3px_rgba(var(--primary-rgb,59,130,246),0.08)]"
              : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/30"
        )}
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-colors",
              pasteFlash
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "border-border/70 bg-card text-primary"
            )}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : pasteFlash ? (
              <Check className="h-5 w-5" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {pasteFlash ? t("workMedia.pasted") : t("workMedia.title")}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {imagesOnly ? t("workMedia.screenshotHint") : t("workMedia.hint")}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <ClipboardPaste className="size-3 opacity-80" />
              <span>{t("workMedia.pasteHint")}</span>
            </p>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-xl"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {t("workMedia.browse")}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={
              imagesOnly
                ? "image/jpeg,image/png,image/webp,image/gif"
                : acceptMediaAttr()
            }
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
              <div className="relative aspect-[4/3] bg-muted/40">
                <AuthMediaPreview
                  src={item.previewUrl}
                  kind={item.kind}
                  alt={item.name}
                />
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
