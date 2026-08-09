import { notifyQuietly } from "@/services/notification-core.service";
import { getSessionUserId } from "@/stores/session-store";

/* ── Domain producers: tasks, meetings, payroll, targets ─────────────── */

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
