import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { Announcement } from "@/types";

export class AnnouncementRepository extends CollectionRepository<Announcement> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.announcements);
  }

  async list(priority?: Announcement["priority"]): Promise<Announcement[]> {
    return this.withLatency(async () => {
      let results = await super.list();
      if (priority) {
        results = results.filter((a) => a.priority === priority);
      }
      return results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }
}

export const announcementRepository = new AnnouncementRepository();
