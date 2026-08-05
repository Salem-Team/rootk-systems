import { touchEntity } from "@/lib/entity";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import { notificationVisibleToUser } from "@/lib/notification-utils";
import type { AppNotification, NotificationAudience, UserRole } from "@/types";

function audienceForRole(role: UserRole): NotificationAudience[] {
  return role === "admin" ? ["all", "admin"] : ["all", "employee"];
}

export class NotificationRepository extends CollectionRepository<AppNotification> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.notifications);
  }

  async listForUser(
    role: UserRole,
    userId: string,
    employeeId?: string
  ): Promise<AppNotification[]> {
    return this.withLatency(async () => {
      const allowed = audienceForRole(role);
      const items = await this.list();
      return items
        .filter((n) =>
          notificationVisibleToUser(n, userId, allowed, employeeId)
        )
        .sort((a, b) => {
          const p =
            priorityRank(b.priority) - priorityRank(a.priority) ||
            b.createdAt.localeCompare(a.createdAt);
          return p;
        });
    });
  }

  /** @deprecated use listForUser */
  async listForRole(role: UserRole): Promise<AppNotification[]> {
    return this.withLatency(async () => {
      const allowed = audienceForRole(role);
      const items = await this.list();
      return items
        .filter((n) => allowed.includes(n.audience))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  async markRead(id: string, userId: string): Promise<AppNotification | null> {
    return this.mutate(id, (current) => {
      if (current.readBy.includes(userId)) return current;
      return touchEntity(current, userId, {
        readBy: [...current.readBy, userId],
      });
    });
  }

  async markAllRead(
    userId: string,
    role: UserRole,
    employeeId?: string
  ): Promise<AppNotification[]> {
    return this.withLatency(async () => {
      const allowed = audienceForRole(role);
      const items = await this.list();
      const next = items.map((item) => {
        if (!notificationVisibleToUser(item, userId, allowed, employeeId)) {
          return item;
        }
        if (item.readBy.includes(userId)) return item;
        return touchEntity(item, userId, {
          readBy: [...item.readBy, userId],
        });
      });
      await this.writeAll(next);
      return next.filter((n) =>
        notificationVisibleToUser(n, userId, allowed, employeeId)
      );
    });
  }

  /** Soft retention purge — drop items older than cutoff ISO timestamp. */
  async purgeOlderThan(cutoffIso: string): Promise<number> {
    return this.withLatency(async () => {
      const items = await this.list();
      const keep = items.filter((n) => n.createdAt >= cutoffIso);
      const removed = items.length - keep.length;
      if (removed > 0) await this.writeAll(keep);
      return removed;
    });
  }
}

function priorityRank(
  priority: AppNotification["priority"] | undefined
): number {
  switch (priority) {
    case "urgent":
      return 4;
    case "high":
      return 3;
    case "normal":
      return 2;
    case "low":
      return 1;
    default:
      return 2;
  }
}

export const notificationRepository = new NotificationRepository();
