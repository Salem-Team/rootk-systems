import {
  fetchNotifications,
  patchNotificationRead,
  postMarkAllNotificationsRead,
  postNotification,
} from "@/api/notifications.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit } from "@/lib/entity";
import { createId } from "@/lib/id";
import { emitNotificationsUpdated } from "@/lib/events";
import { ValidationError } from "@/lib/errors";
import {
  companyAllowsCategory,
  companyAllowsSound,
  normalizeCompanyNotifications,
} from "@/lib/notification-policy";
import { notificationMatchesPrefs } from "@/lib/notification-utils";
import { notificationRepository, settingsRepository } from "@/repositories";
import {
  createNotificationSchema,
  type CreateNotificationDto,
} from "@/schemas/notification.schema";
import { fromError, ok } from "@/services/api-result";
import { getSessionUserId, getWorkEmployeeId } from "@/stores/session-store";
import { getUserPreferences } from "@/services/user-preferences.service";
import type {
  ApiResponse,
  AppNotification,
  CreateNotificationInput,
  UserRole,
} from "@/types";

export type { CreateNotificationInput };

export function emptyNotification(id: string): AppNotification {
  return {
    id,
    titleKey: "",
    bodyKey: "",
    category: "system",
    priority: "normal",
    audience: "all",
    readBy: [],
    companyId: "",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 0,
    metadata: {},
  };
}

async function loadCompanyNotificationPolicy() {
  try {
    const settings = await settingsRepository.getSyncSafe();
    return normalizeCompanyNotifications(settings.notifications);
  } catch {
    return normalizeCompanyNotifications(undefined);
  }
}

async function pruneExpiredNotifications(retentionDays: number): Promise<void> {
  if (retentionDays <= 0) return;
  try {
    const cutoff = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();
    await notificationRepository.purgeOlderThan(cutoff);
  } catch {
    /* best-effort */
  }
}

/** GET /notifications — personalized feed for the current session user. */
export async function getNotifications(
  role: UserRole,
  userId = getSessionUserId()
): Promise<ApiResponse<AppNotification[]>> {
  if (isApiMode()) return fetchNotifications(role, { role });
  try {
    const policy = await loadCompanyNotificationPolicy();
    await pruneExpiredNotifications(policy.retentionDays);

    const employeeId = getWorkEmployeeId();
    const items = await notificationRepository.listForUser(
      role,
      userId,
      employeeId
    );
    const prefsRes = await getUserPreferences(userId);
    const prefs =
      prefsRes.success && prefsRes.data
        ? prefsRes.data.notifications
        : null;
    const filtered = items.filter((n) => {
      if (!companyAllowsCategory(policy, n.category)) return false;
      return notificationMatchesPrefs(n, prefs);
    });
    return ok(filtered);
  } catch (error) {
    return fromError(error, []);
  }
}

/** PATCH /notifications/:id/read */
export async function markNotificationRead(
  id: string,
  userId: string
): Promise<ApiResponse<AppNotification | null>> {
  if (isApiMode()) {
    const res = await patchNotificationRead(id);
    if (res.success) emitNotificationsUpdated();
    return res;
  }
  try {
    const updated = await notificationRepository.markRead(id, userId);
    emitNotificationsUpdated();
    return ok(updated, "Notification marked as read");
  } catch (error) {
    return fromError(error, null);
  }
}

/** POST /notifications/read-all */
export async function markAllNotificationsRead(
  userId: string,
  role: UserRole
): Promise<ApiResponse<AppNotification[]>> {
  if (isApiMode()) {
    const res = await postMarkAllNotificationsRead();
    if (res.success) emitNotificationsUpdated();
    return res;
  }
  try {
    const items = await notificationRepository.markAllRead(
      userId,
      role,
      getWorkEmployeeId()
    );
    emitNotificationsUpdated();
    return ok(items, "All notifications marked as read");
  } catch (error) {
    return fromError(error, []);
  }
}

/** POST /notifications — create a system notification (local demo + future API). */
export async function pushNotification(
  input: CreateNotificationInput
): Promise<ApiResponse<AppNotification>> {
  if (isApiMode()) {
    const res = await postNotification(input);
    if (res.success) {
      emitNotificationsUpdated({
        playSound: true,
        audience: input.audience,
        recipientIds: input.recipientIds,
        category: input.category,
        priority: input.priority,
      });
    }
    return res;
  }

  try {
    const policy = await loadCompanyNotificationPolicy();
    if (!companyAllowsCategory(policy, input.category)) {
      return ok(
        emptyNotification(""),
        "Notification suppressed by company policy"
      );
    }

    const parsed = createNotificationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid notification payload",
        parsed.error.flatten()
      );
    }
    const data = parsed.data as CreateNotificationDto;
    const actor = data.actorId ?? getSessionUserId();
    const priority = data.priority ?? "normal";
    const notification = enrichWithAudit(
      {
        id: createId("notif"),
        titleKey: data.titleKey,
        bodyKey: data.bodyKey,
        vars: data.vars,
        category: data.category,
        priority,
        audience: data.audience,
        recipientIds: data.recipientIds,
        href: data.href,
        entityType: data.entityType,
        entityId: data.entityId,
        actorId: actor,
        readBy: [],
        metadata: {
          channels: {
            inApp: policy.inApp,
            email: policy.email,
            push: policy.push,
          },
        },
      },
      actor
    );
    await notificationRepository.create(notification);
    emitNotificationsUpdated({
      playSound: companyAllowsSound(policy, priority),
      audience: notification.audience,
      recipientIds: notification.recipientIds,
      category: notification.category,
      priority,
    });
    return ok(notification, "Notification created");
  } catch (error) {
    return fromError(error, emptyNotification(""));
  }
}

/** Fire-and-forget helper — never throws into domain flows. */
export async function notifyQuietly(
  input: CreateNotificationInput
): Promise<void> {
  try {
    const res = await pushNotification(input);
    if (!res.success && process.env.NODE_ENV !== "production") {
      console.warn("[notifications] push failed:", res.message);
    }
  } catch {
    // Domain actions should not fail because of notification delivery.
  }
}

/** Resolve a human-readable employee name for notification bodies. */
export async function resolveEmployeeName(
  employeeId: string,
  fallback?: string
): Promise<string> {
  if (fallback && fallback !== employeeId) return fallback;
  try {
    const { employeeRepository } = await import("@/repositories");
    const emp = await employeeRepository.findById(employeeId);
    return emp?.name ?? fallback ?? employeeId;
  } catch {
    return fallback ?? employeeId;
  }
}
