import { BadRequestException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { dirname, join, resolve } from "path";

export const VOICE_MAX_BYTES = 4 * 1024 * 1024;
export const VOICE_MAX_DURATION_MS = 3 * 60 * 1000;
export const VOICE_ALLOWED_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

function uploadsRoot(): string {
  return (
    process.env.ROOTK_UPLOADS_DIR?.trim() ||
    resolve(process.cwd(), "uploads")
  );
}

function extForMime(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

function normalizeMime(raw: string): string {
  return raw.trim().toLowerCase().split(";")[0]!.trim();
}

export function assertVoicePayload(input: {
  dataBase64?: string;
  mime?: string;
  durationMs?: number;
}): { buffer: Buffer; mime: string; durationMs: number } {
  const mimeRaw = String(input.mime ?? "").trim().toLowerCase();
  const mimeBase = normalizeMime(mimeRaw);
  if (
    !mimeRaw ||
    (!VOICE_ALLOWED_MIME.has(mimeRaw) && !VOICE_ALLOWED_MIME.has(mimeBase))
  ) {
    throw new BadRequestException("Unsupported voice format");
  }
  const durationMs = Math.round(Number(input.durationMs ?? 0));
  if (!Number.isFinite(durationMs) || durationMs < 400 || durationMs > VOICE_MAX_DURATION_MS) {
    throw new BadRequestException("Voice duration must be between 0.4s and 3 minutes");
  }
  const raw = String(input.dataBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
  if (!raw) throw new BadRequestException("Voice data is required");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw new BadRequestException("Invalid voice data");
  }
  if (buffer.length < 64 || buffer.length > VOICE_MAX_BYTES) {
    throw new BadRequestException("Voice file is too large or empty");
  }
  return { buffer, mime: mimeBase || "audio/webm", durationMs };
}

export async function saveCompanyVoiceFile(
  companyId: string,
  buffer: Buffer,
  mime: string
): Promise<string> {
  const safeCompany = companyId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeCompany) throw new BadRequestException("Invalid company");
  const fileId = `${randomUUID()}.${extForMime(mime)}`;
  const abs = join(uploadsRoot(), "voices", safeCompany, fileId);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return fileId;
}

export function voiceAbsolutePath(companyId: string, fileId: string): string {
  const safeCompany = companyId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFile = fileId.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeCompany || !safeFile || safeFile !== fileId) {
    throw new BadRequestException("Invalid voice reference");
  }
  const abs = resolve(uploadsRoot(), "voices", safeCompany, safeFile);
  const root = resolve(uploadsRoot(), "voices", safeCompany);
  if (!abs.startsWith(root + "/") && abs !== root) {
    throw new BadRequestException("Invalid voice path");
  }
  return abs;
}

export async function readCompanyVoiceFile(
  companyId: string,
  fileId: string
): Promise<Buffer> {
  return readFile(voiceAbsolutePath(companyId, fileId));
}

export async function deleteCompanyVoiceFile(
  companyId: string,
  fileId: string
): Promise<void> {
  try {
    await unlink(voiceAbsolutePath(companyId, fileId));
  } catch {
    /* best-effort */
  }
}

/** Stable short hash for logging without leaking paths. */
export function voiceFingerprint(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 12);
}
