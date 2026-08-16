import { formatISO } from "date-fns";
import { patchApproveLeave, patchRejectLeave } from "@/api/leave.api";
import { hasPermissionId } from "@/constants/permissions";
import { isApiMode } from "@/lib/env";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { demoNow } from "@/lib/mock-date";
import { listWorkingDates } from "@/lib/working-days";
import { attendanceRepository, leaveRepository, scheduleRepository } from "@/repositories";
import { reviewLeaveSchema } from "@/schemas";
import { fromError, ok } from "@/services/api-result";
import {
  getSessionPermissions,
  getSessionRole,
  getSessionUserId,
} from "@/stores/session-store";
import type { ApiResponse, LeaveRequest } from "@/types";
import { emptyLeave } from "./leave-service-helpers";
import { localDirectReportIds } from "@/services/employee-scope";

async function assertCanReviewLeave(
  employeeId: string,
  kind: "approve" | "reject"
) {
  const allPerm = kind === "approve" ? "leave.approve" : "leave.reject";
  const teamPerm = kind === "approve" ? "leave.approveTeam" : "leave.rejectTeam";
  const permissions = getSessionPermissions();
  const role = getSessionRole();
  if (hasPermissionId(allPerm, permissions, role)) return;
  if (!hasPermissionId(teamPerm, permissions, role)) {
    throw new ForbiddenError(
      kind === "approve"
        ? "You do not have permission to approve leave"
        : "You do not have permission to reject leave"
    );
  }
  const reports = await localDirectReportIds();
  if (!reports.includes(employeeId)) {
    throw new ForbiddenError(
      "You can only act on people who report directly to you"
    );
  }
}

/** Local-mode approval apply (no role gate — used by admin approve + auto-approve). */
export async function applyApprovedLeaveLocal(
  id: string,
  reviewerNote?: string
): Promise<LeaveRequest> {
  const current = await leaveRepository.findById(id);
  if (!current) throw new NotFoundError("Leave request not found");
  if (current.status !== "pending") {
    throw new ConflictError("Only pending requests can be approved");
  }

  const actorId = getSessionUserId();
  const updated = await leaveRepository.update(
    id,
    touchEntity(current, actorId, {
      status: "approved",
      reviewedAt: formatISO(demoNow()),
      reviewerNote: reviewerNote ?? "Approved",
    })
  );

  if (!updated) throw new NotFoundError("Leave request not found");

  // Mark working days in the leave range as on_leave for attendance KPIs.
  try {
    const schedule = await scheduleRepository.getSyncSafe();
    const holidayDates = new Set(
      schedule.holidays
        .filter((h) => h.type === "holiday")
        .map((h) => h.date)
    );
    const leaveDays = listWorkingDates(
      updated.startDate,
      updated.endDate,
      schedule.workingDays,
      holidayDates
    );
    const items = await attendanceRepository.list();
    let changed = false;
    for (const date of leaveDays) {
      const existing = items.find(
        (r) => r.employeeId === updated.employeeId && r.date === date
      );
      if (existing) {
        if (existing.status === "on_leave") continue;
        const next = touchEntity(existing, actorId, {
          status: "on_leave" as const,
          checkIn: undefined,
          checkOut: undefined,
          workingMinutes: 0,
          isLate: false,
          isEarlyLeave: false,
          lateMinutes: 0,
          note: existing.note ?? `Leave ${updated.type}`,
        });
        const idx = items.findIndex((r) => r.id === existing.id);
        if (idx >= 0) items[idx] = next;
        changed = true;
      } else {
        items.unshift(
          enrichWithAudit(
            {
              id: `att-${date.replace(/-/g, "")}-${updated.employeeId.slice(-3)}-lv`,
              employeeId: updated.employeeId,
              date,
              status: "on_leave",
              workingMinutes: 0,
              isLate: false,
              isEarlyLeave: false,
              lateMinutes: 0,
              note: `Approved ${updated.type} leave`,
            },
            actorId
          )
        );
        changed = true;
      }
    }
    if (changed) await attendanceRepository.persist(items);

    const { todayKey } = await import("@/lib/mock-date");
    const coversToday =
      updated.startDate <= todayKey() && updated.endDate >= todayKey();
    if (coversToday) {
      const { updateEmployeeStatus } = await import(
        "@/services/employees.service"
      );
      void updateEmployeeStatus(updated.employeeId, "on_leave");
    }
  } catch {
    // Attendance sync is best-effort; leave approval still succeeds.
  }

  const { notifyLeaveDecision } = await import(
    "@/services/notification.service"
  );
  void notifyLeaveDecision({
    leaveId: updated.id,
    employeeId: updated.employeeId,
    approved: true,
    actorId,
  });

  return updated;
}

/** PATCH /leave/:id/approve */
export async function approveLeave(
  id: string,
  reviewerNote?: string
): Promise<ApiResponse<LeaveRequest>> {
  if (isApiMode()) return patchApproveLeave(id, reviewerNote);
  try {
    const current = await leaveRepository.findById(id);
    if (!current) throw new NotFoundError("Leave request not found");
    await assertCanReviewLeave(current.employeeId, "approve");
    const parsed = reviewLeaveSchema.safeParse({ reviewerNote });
    if (!parsed.success) {
      throw new ValidationError("Invalid review payload", parsed.error.flatten());
    }

    const updated = await applyApprovedLeaveLocal(
      id,
      parsed.data.reviewerNote ?? "Approved"
    );
    return ok(updated, "Leave request approved");
  } catch (error) {
    return fromError(error, emptyLeave(id));
  }
}

/** PATCH /leave/:id/reject */
export async function rejectLeave(
  id: string,
  reviewerNote?: string
): Promise<ApiResponse<LeaveRequest>> {
  if (isApiMode()) return patchRejectLeave(id, reviewerNote);
  try {
    const current = await leaveRepository.findById(id);
    if (!current) throw new NotFoundError("Leave request not found");
    await assertCanReviewLeave(current.employeeId, "reject");
    const parsed = reviewLeaveSchema.safeParse({ reviewerNote });
    if (!parsed.success) {
      throw new ValidationError("Invalid review payload", parsed.error.flatten());
    }
    if (current.status !== "pending") {
      throw new ConflictError("Only pending requests can be rejected");
    }

    const updated = await leaveRepository.update(
      id,
      touchEntity(current, getSessionUserId(), {
        status: "rejected",
        reviewedAt: formatISO(demoNow()),
        reviewerNote: parsed.data.reviewerNote ?? "Rejected",
      })
    );

    if (!updated) throw new NotFoundError("Leave request not found");
    const { notifyLeaveDecision } = await import(
      "@/services/notification.service"
    );
    void notifyLeaveDecision({
      leaveId: updated.id,
      employeeId: updated.employeeId,
      approved: false,
      actorId: getSessionUserId(),
    });
    return ok(updated, "Leave request rejected");
  } catch (error) {
    return fromError(error, emptyLeave(id));
  }
}
