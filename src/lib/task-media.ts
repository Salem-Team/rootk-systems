/** Shared task media helpers (client). */

export type WorkTaskMediaKind = "image" | "video";

export interface WorkTaskMediaItem {
  id: string;
  kind: WorkTaskMediaKind;
  mime: string;
  name: string;
  sizeBytes: number;
  /** API path, data URL, or blob URL for preview/playback. */
  url?: string;
}

/** Local draft before the task is saved. */
export interface WorkTaskMediaDraft {
  localId: string;
  kind: WorkTaskMediaKind;
  mime: string;
  name: string;
  sizeBytes: number;
  dataBase64: string;
  previewUrl: string;
  /** Existing server id when editing. */
  id?: string;
}

export const TASK_MEDIA_IMAGE_MAX = 5 * 1024 * 1024;
export const TASK_MEDIA_VIDEO_MAX = 28 * 1024 * 1024;
export const TASK_MEDIA_MAX_IMAGES = 6;
export const TASK_MEDIA_MAX_VIDEOS = 2;
export const TASK_MEDIA_MAX_ITEMS = 8;

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function mediaKindForMime(mime: string): WorkTaskMediaKind | null {
  const base = mime.trim().toLowerCase().split(";")[0]!.trim();
  if (IMAGE_MIME.has(base)) return "image";
  if (VIDEO_MIME.has(base)) return "video";
  return null;
}

export function formatMediaBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function acceptMediaAttr(): string {
  return "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
}

export async function fileToMediaDraft(
  file: File
): Promise<{ ok: true; draft: WorkTaskMediaDraft } | { ok: false; error: string }> {
  const mime = file.type.trim().toLowerCase();
  const kind = mediaKindForMime(mime);
  if (!kind) {
    return { ok: false, error: "unsupported" };
  }
  const max = kind === "image" ? TASK_MEDIA_IMAGE_MAX : TASK_MEDIA_VIDEO_MAX;
  if (file.size < 32 || file.size > max) {
    return { ok: false, error: kind === "image" ? "imageTooLarge" : "videoTooLarge" };
  }

  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const raw = result.replace(/^data:[^;]+;base64,/, "");
      resolve(raw);
    };
    reader.readAsDataURL(file);
  }).catch(() => "");

  if (!dataBase64) return { ok: false, error: "readFailed" };

  return {
    ok: true,
    draft: {
      localId: `local-${crypto.randomUUID()}`,
      kind,
      mime,
      name: file.name.slice(0, 120) || "media",
      sizeBytes: file.size,
      dataBase64,
      previewUrl: URL.createObjectURL(file),
    },
  };
}

export function canAddMediaDraft(
  drafts: WorkTaskMediaDraft[],
  kind: WorkTaskMediaKind
): boolean {
  if (drafts.length >= TASK_MEDIA_MAX_ITEMS) return false;
  const images = drafts.filter((d) => d.kind === "image").length;
  const videos = drafts.filter((d) => d.kind === "video").length;
  if (kind === "image") return images < TASK_MEDIA_MAX_IMAGES;
  return videos < TASK_MEDIA_MAX_VIDEOS;
}

/** Payload for create/update API. */
export function mediaDraftsToPayload(drafts: WorkTaskMediaDraft[]) {
  return drafts.map((d) =>
    d.id && !d.dataBase64
      ? { id: d.id }
      : d.id && d.dataBase64
        ? {
            id: d.id,
            dataBase64: d.dataBase64,
            mime: d.mime,
            name: d.name,
            kind: d.kind,
          }
        : {
            dataBase64: d.dataBase64,
            mime: d.mime,
            name: d.name,
            kind: d.kind,
          }
  );
}

export function mediaItemsToDrafts(items: WorkTaskMediaItem[]): WorkTaskMediaDraft[] {
  return items.map((item) => ({
    localId: item.id,
    id: item.id,
    kind: item.kind,
    mime: item.mime,
    name: item.name,
    sizeBytes: item.sizeBytes,
    dataBase64: "",
    previewUrl: item.url ?? "",
  }));
}

export function revokeMediaDraftPreviews(drafts: WorkTaskMediaDraft[]) {
  for (const d of drafts) {
    if (d.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(d.previewUrl);
    }
  }
}
