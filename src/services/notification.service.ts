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

function emptyNotification(id: string): AppNotification {
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

async function resolveEmployeeName(
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

/* ── Domain producers ─────────────────────────────────────────────── */

export async function notifyLeaveSubmitted(opts: {
  leaveId: string;
  employeeId: string;
  employeeName?: string;
  days: number;
}): Promise<void> {
  const name = await resolveEmployeeName(opts.employeeId, opts.employeeName);
  await notifyQuietly({
    titleKey: "notifications.leaveSubmittedTitle",
    bodyKey: "notifications.leaveSubmittedBody",
    vars: {
      name,
      days: opts.days,
    },
    category: "leave",
    priority: "high",
    audience: "admin",
    href: "/leave",
    entityType: "leave",
    entityId: opts.leaveId,
    actorId: opts.employeeId,
  });
}

export async function notifyLeaveDecision(opts: {
  leaveId: string;
  employeeId: string;
  approved: boolean;
  actorId: string;
}): Promise<void> {
  await notifyQuietly({
    titleKey: opts.approved
      ? "notifications.leaveApprovedTitle"
      : "notifications.leaveRejectedTitle",
    bodyKey: opts.approved
      ? "notifications.leaveApprovedBody"
      : "notifications.leaveRejectedBody",
    category: "leave",
    priority: "high",
    audience: "employee",
    recipientIds: [opts.employeeId],
    href: "/leave",
    entityType: "leave",
    entityId: opts.leaveId,
    actorId: opts.actorId,
  });
}

export async function notifyTaskAssigned(opts: {
  taskId: string;
  title: string;
  assigneeIds: string[];
  actorId: string;
  origin?: "assigned" | "personal";
}): Promise<void> {
  if (opts.origin === "personal") return;
  const recipients = opts.assigneeIds.filter((id) => id !== opts.actorId);
  if (recipients.length === 0) return;
  await notifyQuietly({
    titleKey: "notifications.taskAssignedTitle",
    bodyKey: "notifications.taskAssignedBody",
    vars: { title: opts.title },
    category: "work",
    priority: "high",
    audience: "employee",
    recipientIds: recipients,
    href: `/tasks?task=${opts.taskId}`,
    entityType: "task",
    entityId: opts.taskId,
    actorId: opts.actorId,
  });
  // Also surface on admin pulse feed
  await notifyQuietly({
    titleKey: "notifications.taskAssignedAdminTitle",
    bodyKey: "notifications.taskAssignedAdminBody",
    vars: { title: opts.title, count: recipients.length },
    category: "work",
    priority: "normal",
    audience: "admin",
    href: "/tasks",
    entityType: "task",
    entityId: opts.taskId,
    actorId: opts.actorId,
  });
}

export async function notifyMeetingScheduled(opts: {
  meetingId: string;
  title: string;
  participantIds: string[];
  actorId: string;
  origin?: "assigned" | "personal";
}): Promise<void> {
  const recipients = opts.participantIds.filter((id) => id !== opts.actorId);
  if (recipients.length === 0 && opts.origin === "personal") return;
  if (recipients.length > 0) {
    await notifyQuietly({
      titleKey: "notifications.meetingInviteTitle",
      bodyKey: "notifications.meetingInviteBody",
      vars: { title: opts.title },
      category: "work",
      priority: "normal",
      audience: "all",
      recipientIds: recipients,
      href: `/tasks?tab=meetings&meeting=${opts.meetingId}`,
      entityType: "meeting",
      entityId: opts.meetingId,
      actorId: opts.actorId,
    });
  }
  if (opts.origin !== "personal") {
    await notifyQuietly({
      titleKey: "notifications.meetingScheduledAdminTitle",
      bodyKey: "notifications.meetingScheduledAdminBody",
      vars: { title: opts.title },
      category: "work",
      priority: "normal",
      audience: "admin",
      href: "/tasks?tab=meetings",
      entityType: "meeting",
      entityId: opts.meetingId,
      actorId: opts.actorId,
    });
  }
}

export async function notifyLateCheckIn(opts: {
  employeeId: string;
  employeeName?: string;
  lateMinutes: number;
  recordId: string;
}): Promise<void> {
  const name = await resolveEmployeeName(opts.employeeId, opts.employeeName);
  await notifyQuietly({
    titleKey: "notifications.lateCheckInTitle",
    bodyKey: "notifications.lateCheckInBody",
    vars: {
      name,
      minutes: opts.lateMinutes,
    },
    category: "attendance",
    priority: "high",
    audience: "admin",
    href: "/attendance",
    entityType: "attendance",
    entityId: opts.recordId,
    actorId: opts.employeeId,
  });
}

export async function notifyAnnouncement(opts: {
  titleKey: string;
  bodyKey: string;
  href?: string;
}): Promise<void> {
  await notifyQuietly({
    titleKey: opts.titleKey,
    bodyKey: opts.bodyKey,
    category: "announcement",
    priority: "normal",
    audience: "all",
    href: opts.href ?? "/dashboard",
  });
}

export async function notifyLeaveCancelled(opts: {
  leaveId: string;
  employeeId: string;
  employeeName?: string;
}): Promise<void> {
  const name = await resolveEmployeeName(opts.employeeId, opts.employeeName);
  await notifyQuietly({
    titleKey: "notifications.leaveCancelledTitle",
    bodyKey: "notifications.leaveCancelledBody",
    vars: { name },
    category: "leave",
    priority: "normal",
    audience: "admin",
    href: "/leave",
    entityType: "leave",
    entityId: opts.leaveId,
    actorId: opts.employeeId,
  });
}

export async function notifyEarlyLeave(opts: {
  employeeId: string;
  employeeName?: string;
  earlyMinutes: number;
  recordId: string;
}): Promise<void> {
  const name = await resolveEmployeeName(opts.employeeId, opts.employeeName);
  await notifyQuietly({
    titleKey: "notifications.earlyLeaveTitle",
    bodyKey: "notifications.earlyLeaveBody",
    vars: {
      name,
      minutes: opts.earlyMinutes,
    },
    category: "attendance",
    priority: "high",
    audience: "admin",
    href: "/attendance",
    entityType: "attendance",
    entityId: opts.recordId,
    actorId: opts.employeeId,
  });
}

export async function notifyEmployeeCreated(opts: {
  employeeId: string;
  name: string;
  actorId: string;
}): Promise<void> {
  await notifyQuietly({
    titleKey: "notifications.employeeCreatedTitle",
    bodyKey: "notifications.employeeCreatedBody",
    vars: { name: opts.name },
    category: "system",
    priority: "normal",
    audience: "admin",
    href: `/employees?id=${opts.employeeId}`,
    entityType: "employee",
    entityId: opts.employeeId,
    actorId: opts.actorId,
  });
}

export async function notifyEmployeeStatusChanged(opts: {
  employeeId: string;
  name: string;
  status: string;
  actorId: string;
}): Promise<void> {
  await notifyQuietly({
    titleKey: "notifications.employeeStatusTitle",
    bodyKey: "notifications.employeeStatusBody",
    vars: { name: opts.name, status: opts.status },
    category: "system",
    priority: "high",
    audience: "admin",
    href: `/employees?id=${opts.employeeId}`,
    entityType: "employee",
    entityId: opts.employeeId,
    actorId: opts.actorId,
  });
}

export async function notifyPayrollAdvanced(opts: {
  status: string;
  actorId: string;
  runId?: string;
}): Promise<void> {
  await notifyQuietly({
    titleKey: "notifications.payrollAdvancedTitle",
    bodyKey: "notifications.payrollAdvancedBody",
    vars: { status: opts.status },
    category: "payroll",
    priority: "high",
    audience: "admin",
    href: "/payroll",
    entityType: "payroll",
    entityId: opts.runId,
    actorId: opts.actorId,
  });
}

export async function notifyTaskCompleted(opts: {
  taskId: string;
  title: string;
  actorId: string;
  notifyAdmin?: boolean;
}): Promise<void> {
  if (opts.notifyAdmin !== false) {
    await notifyQuietly({
      titleKey: "notifications.taskCompletedAdminTitle",
      bodyKey: "notifications.taskCompletedAdminBody",
      vars: { title: opts.title },
      category: "work",
      priority: "normal",
      audience: "admin",
      href: `/tasks?task=${opts.taskId}`,
      entityType: "task",
      entityId: opts.taskId,
      actorId: opts.actorId,
    });
  }
}

export async function notifyTargetAssigned(target: {
  id: string;
  title: string;
  assigneeIds: string[];
  endDate: string;
}): Promise<void> {
  await notifyQuietly({
    titleKey: "notifications.targetAssignedTitle",
    bodyKey: "notifications.targetAssignedBody",
    vars: { title: target.title, deadline: target.endDate },
    category: "target",
    priority: "normal",
    audience: "employee",
    recipientIds: target.assigneeIds,
    href: "/targets",
    entityType: "performance_target",
    entityId: target.id,
    actorId: getSessionUserId(),
  });
}

export async function notifyTargetProgress(
  target: { id: string; title: string; assigneeIds: string[]; endDate: string },
  percentage: number
): Promise<void> {
  await notifyQuietly({
    titleKey: "notifications.targetProgressTitle",
    bodyKey: "notifications.targetProgressBody",
    vars: {
      title: target.title,
      progress: `${percentage}%`,
      deadline: target.endDate,
    },
    category: "target",
    priority: percentage >= 100 ? "high" : "normal",
    audience: "employee",
    recipientIds: target.assigneeIds,
    href: "/targets",
    entityType: "performance_target",
    entityId: target.id,
    actorId: getSessionUserId(),
  });
}

export async function notifyTargetWarning(
  target: { id: string; title: string; endDate: string },
  warning: { id: string; employeeId: string; reason: string }
): Promise<void> {
  await notifyQuietly({
    titleKey: "notifications.targetWarningTitle",
    bodyKey: "notifications.targetWarningBody",
    vars: {
      title: target.title,
      deadline: target.endDate,
      reason: warning.reason,
    },
    category: "target",
    priority: "urgent",
    audience: "employee",
    recipientIds: [warning.employeeId],
    href: "/targets/warnings",
    entityType: "target_warning",
    entityId: warning.id,
    actorId: getSessionUserId(),
  });
}
