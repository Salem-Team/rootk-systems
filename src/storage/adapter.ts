/**
 * Storage Adapter contract.
 * Local mode uses LocalStorageAdapter.
 * API mode bypasses this layer — services call src/api/* via HttpClient.
 */
export interface StorageAdapter {
  readonly name: string;
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(namespacePrefix?: string): Promise<void>;
  keys(namespacePrefix?: string): Promise<string[]>;
}
