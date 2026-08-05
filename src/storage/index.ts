import type { StorageAdapter } from "./adapter";
import { LocalStorageAdapter } from "./local-storage.adapter";

let adapter: StorageAdapter | null = null;

/** DI-friendly accessor — swap implementation here for API migration. */
export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    adapter = new LocalStorageAdapter();
  }
  return adapter;
}

/** Test / migration helper. */
export function setStorageAdapter(next: StorageAdapter): void {
  adapter = next;
}

export type { StorageAdapter } from "./adapter";
export { LocalStorageAdapter } from "./local-storage.adapter";
export { MemoryStorageAdapter } from "./memory.adapter";
export { ApiStorageAdapter } from "./api.adapter.stub";
export { StorageKeys } from "./keys";
