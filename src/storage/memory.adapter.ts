import type { StorageAdapter } from "./adapter";

/** SSR-safe in-memory fallback (also used in tests). */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly name = "memory";
  private readonly store = new Map<string, string>();

  async getItem<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(namespacePrefix?: string): Promise<void> {
    if (!namespacePrefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(namespacePrefix)) this.store.delete(key);
    }
  }

  async keys(namespacePrefix?: string): Promise<string[]> {
    const all = [...this.store.keys()];
    return namespacePrefix
      ? all.filter((k) => k.startsWith(namespacePrefix))
      : all;
  }
}
