import {
  notifyQuietly,
  resolveEmployeeName,
} from "@/services/notification-core.service";

/* ── Domain producers: leave, attendance, employee lifecycle ────────── */

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
