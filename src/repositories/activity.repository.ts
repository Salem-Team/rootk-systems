import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { Activity } from "@/types";

export class ActivityRepository extends CollectionRepository<Activity> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.activities);
  }

  async latest(limit = 20): Promise<Activity[]> {
    return this.withLatency(async () => {
      const items = await this.list();
      return items
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);
    });
  }
}

export const activityRepository = new ActivityRepository();
