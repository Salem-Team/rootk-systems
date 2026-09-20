import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { dirname, join, resolve } from "path";

export const MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_VIDEO_MAX_BYTES = 28 * 1024 * 1024;
export const MEDIA_MAX_IMAGES = 6;
export const MEDIA_MAX_VIDEOS = 2;
export const MEDIA_MAX_ITEMS = 8;

export const MEDIA_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MEDIA_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export type TaskMediaKind = "image" | "video";

export interface StoredTaskMedia {
  id: string;
  kind: TaskMediaKind;
  mime: string;
  name: string;
  sizeBytes: number;
}

function uploadsRoot(): string {
  return (
    process.env.ROOTK_UPLOADS_DIR?.trim() ||
    resolve(process.cwd(), "uploads")
  );
}

function normalizeMime(raw: string): string {
  return raw.trim().toLowerCase().split(";")[0]!.trim();
}

function extForMime(mime: string, kind: TaskMediaKind): string {
  if (kind === "image") {
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("gif")) return "gif";
    return "jpg";
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "mp4";
}

function kindForMime(mime: string): TaskMediaKind | null {
  if (MEDIA_IMAGE_MIME.has(mime)) return "image";
  if (MEDIA_VIDEO_MIME.has(mime)) return "video";
  return null;
}

export function assertMediaPayload(input: {
  dataBase64?: string;
  mime?: string;
  name?: string;
  kind?: string;
}): { buffer: Buffer; mime: string; kind: TaskMediaKind; name: string } {
  const mime = normalizeMime(String(input.mime ?? ""));
  const kind =
    input.kind === "image" || input.kind === "video"
      ? input.kind
      : kindForMime(mime);
  if (!mime || !kind || kindForMime(mime) !== kind) {
    throw new BadRequestException("Unsupported media format");
  }
  const raw = String(input.dataBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
  if (!raw) throw new BadRequestException("Media data is required");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw new BadRequestException("Invalid media data");
  }
  const max =
    kind === "image" ? MEDIA_IMAGE_MAX_BYTES : MEDIA_VIDEO_MAX_BYTES;
  if (buffer.length < 32 || buffer.length > max) {
    throw new BadRequestException(
      kind === "image"
        ? "Image must be under 5MB"
        : "Video must be under 28MB"
    );
  }
  const name = String(input.name ?? "media")
    .trim()
    .slice(0, 120) || "media";
  return { buffer, mime, kind, name };
}

export async function saveCompanyTaskMedia(
  companyId: string,
  buffer: Buffer,
  mime: string,
  kind: TaskMediaKind
): Promise<string> {
  const safeCompany = companyId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeCompany) throw new BadRequestException("Invalid company");
  const fileId = `${randomUUID()}.${extForMime(mime, kind)}`;
  const abs = join(uploadsRoot(), "task-media", safeCompany, fileId);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return fileId;
}

export function taskMediaAbsolutePath(
  companyId: string,
  fileId: string
): string {
  const safeCompany = companyId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFile = fileId.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeCompany || !safeFile || safeFile !== fileId) {
    throw new BadRequestException("Invalid media reference");
  }
  const abs = resolve(uploadsRoot(), "task-media", safeCompany, safeFile);
  const root = resolve(uploadsRoot(), "task-media", safeCompany);
  if (!abs.startsWith(root + "/") && abs !== root) {
    throw new BadRequestException("Invalid media path");
  }
  return abs;
}

export async function readCompanyTaskMedia(
  companyId: string,
  fileId: string
): Promise<Buffer> {
  return readFile(taskMediaAbsolutePath(companyId, fileId));
}

export async function deleteCompanyTaskMedia(
  companyId: string,
  fileId: string
): Promise<void> {
  try {
    await unlink(taskMediaAbsolutePath(companyId, fileId));
  } catch {
    /* best-effort */
  }
}

export function parseStoredMedia(raw: unknown): StoredTaskMedia[] {
  if (!Array.isArray(raw)) return [];
  const items: StoredTaskMedia[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const kind = row.kind === "video" ? "video" : row.kind === "image" ? "image" : null;
    const mime = normalizeMime(String(row.mime ?? ""));
    if (!id || !kind || !mime) continue;
    items.push({
      id,
      kind,
      mime,
      name: String(row.name ?? "media").slice(0, 120),
      sizeBytes: Math.max(0, Number(row.sizeBytes ?? 0) || 0),
    });
  }
  return items.slice(0, MEDIA_MAX_ITEMS);
}

/** Resolve create/update media payload into stored refs; delete dropped files. */
export async function resolveTaskMediaPayload(
  companyId: string,
  incoming: unknown,
  previous: StoredTaskMedia[]
): Promise<StoredTaskMedia[]> {
  if (incoming === undefined) return previous;
  if (!Array.isArray(incoming)) {
    throw new BadRequestException("Invalid media payload");
  }

  const next: StoredTaskMedia[] = [];
  const keptIds = new Set<string>();
  let images = 0;
  let videos = 0;

  for (const entry of incoming) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const existingId = String(row.id ?? "").trim();

    if (existingId && !row.dataBase64) {
      const found = previous.find((item) => item.id === existingId);
      if (!found) continue;
      if (found.kind === "image") images += 1;
      else videos += 1;
      if (images > MEDIA_MAX_IMAGES || videos > MEDIA_MAX_VIDEOS) {
        throw new BadRequestException("Too many media files");
      }
      next.push(found);
      keptIds.add(found.id);
      continue;
    }

    const parsed = assertMediaPayload(row);
    if (parsed.kind === "image") images += 1;
    else videos += 1;
    if (images > MEDIA_MAX_IMAGES || videos > MEDIA_MAX_VIDEOS) {
      throw new BadRequestException("Too many media files");
    }
    if (next.length >= MEDIA_MAX_ITEMS) {
      throw new BadRequestException("Too many media files");
    }
    const id = await saveCompanyTaskMedia(
      companyId,
      parsed.buffer,
      parsed.mime,
      parsed.kind
    );
    next.push({
      id,
      kind: parsed.kind,
      mime: parsed.mime,
      name: parsed.name,
      sizeBytes: parsed.buffer.length,
    });
    keptIds.add(id);
  }

  for (const prev of previous) {
    if (!keptIds.has(prev.id)) {
      await deleteCompanyTaskMedia(companyId, prev.id);
    }
  }

  return next;
}

export function mediaUrlForTask(taskId: string, fileId: string): string {
  return `/work/tasks/${taskId}/media/${fileId}`;
}
