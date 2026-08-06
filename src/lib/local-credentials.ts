/**
 * Local-mode credential vault (browser only).
 * Passwords stay off AppUser / API payloads — production uses Nest scrypt hashes.
 */
import { StorageKeys } from "@/storage/keys";

type CredentialMap = Record<string, string>;

function readMap(): CredentialMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(StorageKeys.credentials);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CredentialMap;
  } catch {
    return {};
  }
}

function writeMap(map: CredentialMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(StorageKeys.credentials, JSON.stringify(map));
}

export function getLocalCredential(email: string): string | null {
  const key = email.trim().toLowerCase();
  return readMap()[key] ?? null;
}

export function setLocalCredential(email: string, password: string): void {
  const key = email.trim().toLowerCase();
  const map = readMap();
  map[key] = password;
  writeMap(map);
}

export function removeLocalCredential(email: string): void {
  const key = email.trim().toLowerCase();
  const map = readMap();
  if (!(key in map)) return;
  delete map[key];
  writeMap(map);
}

export function verifyLocalCredential(
  email: string,
  password: string
): boolean {
  const stored = getLocalCredential(email);
  return Boolean(stored && stored === password);
}
