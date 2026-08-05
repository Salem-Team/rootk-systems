import { NotFoundError } from "@/lib/errors";
import { touchEntity } from "@/lib/entity";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { BaseRepository } from "@/repositories/base.repository";
import type { CompanySettings } from "@/types";

export class SettingsRepository extends BaseRepository {
  constructor() {
    super(getStorageAdapter());
  }

  async get(): Promise<CompanySettings> {
    return this.withLatency(async () => {
      const settings = await this.storage.getItem<CompanySettings>(
        StorageKeys.settings
      );
      if (!settings) throw new NotFoundError("Settings not found");
      return {
        ...settings,
        notifications: { ...settings.notifications },
      };
    });
  }

  async getSyncSafe(): Promise<CompanySettings> {
    await this.ready();
    const settings = await this.storage.getItem<CompanySettings>(
      StorageKeys.settings
    );
    if (!settings) throw new NotFoundError("Settings not found");
    return settings;
  }

  async update(
    patch: Partial<
      Omit<CompanySettings, "notifications" | "id"> & {
        notifications?: Partial<CompanySettings["notifications"]>;
      }
    >,
    actorId = "system"
  ): Promise<CompanySettings> {
    return this.withLatency(async () => {
      const current = await this.storage.getItem<CompanySettings>(
        StorageKeys.settings
      );
      if (!current) throw new NotFoundError("Settings not found");

      const { notifications, ...rest } = patch;
      const next = touchEntity(current, actorId, {
        ...rest,
        notifications: notifications
          ? { ...current.notifications, ...notifications }
          : current.notifications,
      });

      await this.storage.setItem(StorageKeys.settings, next);
      return {
        ...next,
        notifications: { ...next.notifications },
      };
    });
  }
}

export const settingsRepository = new SettingsRepository();
