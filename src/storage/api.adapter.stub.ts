import { InternalError } from "@/lib/errors";
import type { StorageAdapter } from "./adapter";

/**
 * @deprecated LEGACY — do not use in new code.
 *
 * Dual-mode goes through `src/services/*` → `src/api/*` (api) or
 * repositories + LocalStorage (local). This class is retained only so
 * existing imports from `@/storage` do not break.
 */
export class ApiStorageAdapter implements StorageAdapter {
  readonly name = "api";

  async getItem<T>(..._args: [string]): Promise<T | null> {
    void _args;
    throw new InternalError(
      "ApiStorageAdapter is deprecated — use src/api clients via services."
    );
  }

  async setItem<T>(..._args: [string, T]): Promise<void> {
    void _args;
    throw new InternalError(
      "ApiStorageAdapter is deprecated — use src/api clients via services."
    );
  }

  async removeItem(..._args: [string]): Promise<void> {
    void _args;
    throw new InternalError(
      "ApiStorageAdapter is deprecated — use src/api clients via services."
    );
  }

  async clear(): Promise<void> {
    throw new InternalError(
      "ApiStorageAdapter is deprecated — use domain delete endpoints."
    );
  }

  async keys(): Promise<string[]> {
    return [];
  }
}
