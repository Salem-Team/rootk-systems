import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";

export const PROJECT_PDF_MAX_BYTES = 10 * 1024 * 1024;

const PDF_MIME = new Set([
  "",
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream",
]);

function uploadsRoot(): string {
  return (
    process.env.ROOTK_UPLOADS_DIR?.trim() ||
    resolve(process.cwd(), "uploads")
  );
}

function safeCompanyId(companyId: string): string {
  const safe = companyId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) throw new BadRequestException("Invalid company");
  return safe;
}

export function assertProjectPdfPayload(input: {
  dataBase64?: string;
  mimeType?: string;
  fileName?: string;
}): { buffer: Buffer; fileName: string } {
  const mime = String(input.mimeType ?? "")
    .trim()
    .toLowerCase()
    .split(";")[0]!
    .trim();
  if (!PDF_MIME.has(mime)) {
    throw new BadRequestException("Only PDF files are allowed");
  }
  const raw = String(input.dataBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
  if (!raw) throw new BadRequestException("PDF file is required");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw new BadRequestException("Invalid PDF data");
  }
  if (buffer.length < 5 || buffer.length > PROJECT_PDF_MAX_BYTES) {
    throw new BadRequestException("PDF must be under 10MB");
  }
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new BadRequestException("Only PDF files are allowed");
  }
  const fileName =
    String(input.fileName ?? "project.pdf")
      .replace(/[/\\]/g, " ")
      .replace(/[\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 180) || "project.pdf";
  return { buffer, fileName: fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf` };
}

export async function saveCompanyProjectPdf(
  companyId: string,
  buffer: Buffer
): Promise<string> {
  const fileId = `${randomUUID()}.pdf`;
  const abs = join(uploadsRoot(), "project-pdf", safeCompanyId(companyId), fileId);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return fileId;
}

export function projectPdfAbsolutePath(companyId: string, fileId: string): string {
  const safeFile = fileId.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeFile || safeFile !== fileId || !safeFile.endsWith(".pdf")) {
    throw new BadRequestException("Invalid PDF reference");
  }
  const abs = resolve(uploadsRoot(), "project-pdf", safeCompanyId(companyId), safeFile);
  const root = resolve(uploadsRoot(), "project-pdf", safeCompanyId(companyId));
  if (!abs.startsWith(`${root}/`)) {
    throw new BadRequestException("Invalid PDF path");
  }
  return abs;
}

export async function readCompanyProjectPdf(
  companyId: string,
  fileId: string
): Promise<Buffer> {
  return readFile(projectPdfAbsolutePath(companyId, fileId));
}

export async function deleteCompanyProjectPdf(
  companyId: string,
  fileId: string
): Promise<void> {
  try {
    await unlink(projectPdfAbsolutePath(companyId, fileId));
  } catch {
    /* best-effort */
  }
}
