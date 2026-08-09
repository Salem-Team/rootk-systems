import { getStorageAdapter } from "@/storage";
import { ensureStorageBootstrapped } from "@/storage/bootstrap";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type {
  OrganicAdHistoryEvent,
  OrganicAdsSettings,
  OrganicAdvertisement,
} from "@/types/organic-ads";

export class OrganicAdvertisementRepository extends CollectionRepository<OrganicAdvertisement> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.organicAds);
  }
}

export class OrganicAdHistoryRepository extends CollectionRepository<OrganicAdHistoryEvent> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.organicAdHistory);
  }

  async latest(limit = 40): Promise<OrganicAdHistoryEvent[]> {
    const all = await this.findAll();
    return [...all]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export class OrganicAdsSettingsRepository {
  private readonly storage = getStorageAdapter();
  private readonly key = StorageKeys.organicAdsSettings;

  async get(): Promise<OrganicAdsSettings | null> {
    await ensureStorageBootstrapped();
    return this.storage.getItem<OrganicAdsSettings>(this.key);
  }

  async set(settings: OrganicAdsSettings): Promise<OrganicAdsSettings> {
    await ensureStorageBootstrapped();
    await this.storage.setItem(this.key, settings);
    return settings;
  }
}

export const organicAdvertisementRepository =
  new OrganicAdvertisementRepository();
export const organicAdHistoryRepository = new OrganicAdHistoryRepository();
export const organicAdsSettingsRepository = new OrganicAdsSettingsRepository();
