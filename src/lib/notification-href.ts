import type { AppNotification } from "@/types";

/**
 * Build a precise in-app deep link for a notification.
 * Prefers an existing specific `href`; otherwise derives from entityType/entityId.
 * Also upgrades bare section roots when entityId is known (API legacy rows).
 */
export function resolveNotificationHref(
  item: Pick<AppNotification, "href" | "entityType" | "entityId" | "category">
): string | undefined {
  const entityId = item.entityId?.trim() || "";
  const href = item.href?.trim() || "";
  const entity = (item.entityType ?? "").toLowerCase();

  if (entityId) {
    if (
      entity === "task" ||
      entity === "work_task" ||
      (item.category === "work" && looksLikeBare(href, "/tasks"))
    ) {
      if (!href.includes("task=")) {
        return withQuery("/tasks", { tab: "tasks", task: entityId });
      }
    }
    if (
      entity === "meeting" ||
      entity === "work_meeting" ||
      (item.category === "work" && href.includes("tab=meetings") && !href.includes("meeting="))
    ) {
      if (!href.includes("meeting=")) {
        return withQuery("/tasks", { tab: "meetings", meeting: entityId });
      }
    }
    if (
      entity === "attendance" ||
      (item.category === "attendance" && looksLikeBare(href, "/attendance"))
    ) {
      // entityId is record id — prefer employee deep-link when encoded in href already
      if (!href.includes("employeeId=") && !href.includes("record=")) {
        return withQuery("/attendance", { record: entityId });
      }
    }
    if (
      entity === "leave" ||
      (item.category === "leave" && looksLikeBare(href, "/leave"))
    ) {
      if (!href.includes("id=")) {
        return withQuery("/leave", { id: entityId });
      }
    }
    if (
      entity === "employee" ||
      (item.category === "system" && looksLikeBare(href, "/employees"))
    ) {
      if (!href.includes("id=")) {
        return withQuery("/employees", { id: entityId });
      }
    }
    if (
      entity === "performance_target" ||
      entity === "target" ||
      (item.category === "target" && looksLikeBare(href, "/targets"))
    ) {
      if (!href.includes("target=") && !href.includes("id=")) {
        return withQuery("/targets", { target: entityId });
      }
    }
    if (entity === "target_warning") {
      return href || "/targets/warnings";
    }
    if (entity === "crm_lead" || entity === "crm_feedback") {
      if (!href.includes("lead=")) {
        return withQuery("/crm", { lead: entityId });
      }
    }
    if (entity === "payroll" || entity === "payroll_run") {
      return href || "/payroll";
    }
  }

  return href || undefined;
}

function looksLikeBare(href: string, root: string): boolean {
  if (!href) return true;
  if (href === root || href === `${root}/`) return true;
  try {
    const url = new URL(href, "https://rootk.local");
    return url.pathname === root && ![...url.searchParams.keys()].length;
  } catch {
    return href === root;
  }
}

function withQuery(
  path: string,
  params: Record<string, string | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const q = qs.toString();
  return q ? `${path}?${q}` : path;
}

/** Attendance deep link for late/early alerts. */
export function attendanceNotificationHref(opts: {
  employeeId: string;
  date?: string;
  recordId?: string;
}): string {
  return withQuery("/attendance", {
    employeeId: opts.employeeId,
    date: opts.date,
    record: opts.recordId,
  });
}

export function taskNotificationHref(taskId: string): string {
  return withQuery("/tasks", { tab: "tasks", task: taskId });
}

export function meetingNotificationHref(meetingId: string): string {
  return withQuery("/tasks", { tab: "meetings", meeting: meetingId });
}

export function leaveNotificationHref(leaveId: string): string {
  return withQuery("/leave", { id: leaveId });
}
