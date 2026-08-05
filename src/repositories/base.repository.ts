import { delay } from "@/lib/utils";
import { ensureStorageBootstrapped } from "@/storage/bootstrap";
import type { StorageAdapter } from "@/storage";
import type { BaseEntity, PaginatedResult, PaginationParams } from "@/types";

function randomLatency(): number {
  return Math.floor(Math.random() * (450 - 120 + 1)) + 120;
}

export abstract class BaseRepository {
  constructor(protected readonly storage: StorageAdapter) {}

  protected async ready(): Promise<void> {
    await ensureStorageBootstrapped();
  }

  protected async withLatency<T>(work: () => Promise<T>): Promise<T> {
    await this.ready();
    await delay(randomLatency());
    return work();
  }
}

export abstract class CollectionRepository<
  T extends BaseEntity & { id: string },
> extends BaseRepository {
  constructor(
    storage: StorageAdapter,
    protected readonly storageKey: string
  ) {
    super(storage);
  }

  protected async readAll(): Promise<T[]> {
    await this.ready();
    return (await this.storage.getItem<T[]>(this.storageKey)) ?? [];
  }

  protected async writeAll(items: T[]): Promise<void> {
    await this.storage.setItem(this.storageKey, items);
  }

  async findAll(includeArchived = false): Promise<T[]> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      return items.filter(
        (item) =>
          !item.deletedAt && (includeArchived || !item.isArchived)
      );
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      return items.find((item) => item.id === id && !item.deletedAt) ?? null;
    });
  }

  async create(entity: T): Promise<T> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      items.unshift(entity);
      await this.writeAll(items);
      return entity;
    });
  }

  async update(id: string, next: T): Promise<T | null> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      const index = items.findIndex((item) => item.id === id && !item.deletedAt);
      if (index === -1) return null;
      items[index] = next;
      await this.writeAll(items);
      return next;
    });
  }

  async delete(id: string, soft = true): Promise<boolean> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      const index = items.findIndex((item) => item.id === id && !item.deletedAt);
      if (index === -1) return false;
      if (soft) {
        items[index] = {
          ...items[index],
          deletedAt: new Date().toISOString(),
          isArchived: true,
          updatedAt: new Date().toISOString(),
          version: items[index].version + 1,
        };
      } else {
        items.splice(index, 1);
      }
      await this.writeAll(items);
      return true;
    });
  }

  async archive(id: string): Promise<T | null> {
    const current = await this.findById(id);
    if (!current) return null;
    return this.update(id, {
      ...current,
      isArchived: true,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    });
  }

  async restore(id: string): Promise<T | null> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const restored = {
        ...items[index],
        deletedAt: null,
        isArchived: false,
        updatedAt: new Date().toISOString(),
        version: items[index].version + 1,
      };
      items[index] = restored;
      await this.writeAll(items);
      return restored;
    });
  }

  async paginate(
    params: PaginationParams = {},
    filter?: (item: T) => boolean
  ): Promise<PaginatedResult<T>> {
    return this.withLatency(async () => {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
      let items = (await this.readAll()).filter(
        (item) => !item.deletedAt && !item.isArchived
      );
      if (filter) items = items.filter(filter);
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        totalPages,
      };
    });
  }

  /** No simulated latency — for service composition / joins. */
  async list(): Promise<T[]> {
    await this.ready();
    return ((await this.storage.getItem<T[]>(this.storageKey)) ?? []).filter(
      (item) => !item.deletedAt && !item.isArchived
    );
  }

  /** Persist collection with a single simulated round-trip. */
  async persist(items: T[]): Promise<void> {
    return this.withLatency(async () => {
      await this.writeAll(items);
    });
  }

  async mutate(
    id: string,
    mutator: (current: T) => T
  ): Promise<T | null> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      const index = items.findIndex((item) => item.id === id && !item.deletedAt);
      if (index === -1) return null;
      const next = mutator(items[index]);
      items[index] = next;
      await this.writeAll(items);
      return next;
    });
  }
}
