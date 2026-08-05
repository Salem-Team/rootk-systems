import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { normalizePreferenceNotifications } from "@/lib/preference-notifications";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { UserPreferences } from "@/types/preferences";

export class UserPreferencesRepository extends CollectionRepository<UserPreferences> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.userPreferences);
  }

  async list(): Promise<UserPreferences[]> {
    return this.findAll();
  }

  async getByUserId(userId: string): Promise<UserPreferences | null> {
    const all = await this.findAll();
    return all.find((p) => p.userId === userId) ?? null;
  }

  async upsertForUser(
    userId: string,
    patch: Partial<
      Pick<UserPreferences, "language" | "appearance"> & {
        notifications?: Partial<UserPreferences["notifications"]>;
      }
    >,
    actorId = userId
  ): Promise<UserPreferences> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      const next = touchEntity(existing, actorId, {
        language: patch.language ?? existing.language,
        appearance: patch.appearance ?? existing.appearance,
        notifications: patch.notifications
          ? normalizePreferenceNotifications({
              ...existing.notifications,
              ...patch.notifications,
            })
          : normalizePreferenceNotifications(existing.notifications),
      });
      await this.update(existing.id, next);
      return next;
    }
    const created = enrichWithAudit(
      {
        id: createId("pref"),
        userId,
        language: patch.language ?? "ar",
        appearance: patch.appearance ?? "system",
        notifications: normalizePreferenceNotifications({
          ...patch.notifications,
        }),
      },
      actorId
    );
    return this.create(created);
  }
}

export const userPreferencesRepository = new UserPreferencesRepository();
