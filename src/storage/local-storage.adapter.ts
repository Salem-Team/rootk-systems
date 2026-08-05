import { InternalError } from "@/lib/errors";
import type { StorageAdapter } from "./adapter";
import { MemoryStorageAdapter } from "./memory.adapter";

/**
 * Browser Local Storage adapter — temporary persistence layer.
 * Components must NEVER call localStorage directly.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = "localStorage";
  private readonly memory = new MemoryStorageAdapter();

  private get canUseDom(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (!this.canUseDom) return this.memory.getItem<T>(key);
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new InternalError("Failed to read from local storage", { key, error });
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!this.canUseDom) {
      await this.memory.setItem(key, value);
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new InternalError("Failed to write to local storage", { key, error });
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.canUseDom) {
      await this.memory.removeItem(key);
      return;
    }
    window.localStorage.removeItem(key);
  }

  async clear(namespacePrefix?: string): Promise<void> {
    if (!this.canUseDom) {
      await this.memory.clear(namespacePrefix);
      return;
    }
    if (!namespacePrefix) {
      window.localStorage.clear();
      return;
    }
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(namespacePrefix)) toRemove.push(key);
    }
    toRemove.forEach((key) => window.localStorage.removeItem(key));
  }

  async keys(namespacePrefix?: string): Promise<string[]> {
    if (!this.canUseDom) return this.memory.keys(namespacePrefix);
    const result: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!namespacePrefix || key.startsWith(namespacePrefix)) result.push(key);
    }
    return result;
  }
}
