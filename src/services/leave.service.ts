import { formatISO } from "date-fns";
import type { CreateLeaveInput, LeaveFilters } from "@/api/contracts";
import {
  deleteLeaveRequest as apiDeleteLeave,
  fetchLeaveById,
  fetchLeaveRequests,
  patchApproveLeave,
  patchRejectLeave,
  postLeaveRequest,
} from "@/api/leave.api";
import { isApiMode } from "@/lib/env";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { demoNow } from "@/lib/mock-date";
import { leaveRepository, scheduleRepository, attendanceRepository } from "@/repositories";
import { createLeaveSchema, reviewLeaveSchema } from "@/schemas";
import { fail, fromError, ok } from "@/services/api-result";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type { ApiResponse, LeaveRequest, LeaveStatus, LeaveType } from "@/types";
import { countWorkingDaysInRange, listWorkingDates } from "@/lib/working-days";

export type { CreateLeaveInput, LeaveFilters };

function emptyLeave(id: string): LeaveRequest {
  return {
    id,
    employeeId: "",
    type: "annual",
    status: "pending",
    startDate: "",
    endDate: "",
    days: 0,
    reason: "",
    submittedAt: "",
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

/** GET /leave */
export async function getLeaveRequests(
  filters: LeaveFilters = {}
): Promise<ApiResponse<LeaveRequest[]>> {
  if (isApiMode()) return fetchLeaveRequests(filters);
  try {
    const scoped =
      getSessionRole() === "employee"
        ? { ...filters, employeeId: getWorkEmployeeId() }
        : filters;
    return ok(await leaveRepository.filter(scoped));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /leave?status=pending */
export async function getPendingLeaveRequests(): Promise<
  ApiResponse<LeaveRequest[]>
> {
  return getLeaveRequests({ status: "pending" });
}

/** GET /leave?employeeId= */
export async function getMyLeaveRequests(
  employeeId = getWorkEmployeeId()
): Promise<ApiResponse<LeaveRequest[]>> {
  return getLeaveRequests({ employeeId });
}

/** GET /leave/:id */
export async function getLeaveById(
  id: string
): Promise<ApiResponse<LeaveRequest | null>> {
  if (isApiMode()) return fetchLeaveById(id);
  try {
    const request = await leaveRepository.findById(id);
    if (!request) return fail(null, "Leave request not found", "NOT_FOUND");
    if (
      getSessionRole() === "employee" &&
      request.employeeId !== getWorkEmployeeId()
    ) {
      throw new ForbiddenError("You can only view your own leave requests");
    }
    return ok(request);
  } catch (error) {
    return fromError(error, null);
  }
}

/** POST /leave */
export async function createLeaveRequest(
  input: CreateLeaveInput
): Promise<ApiResponse<LeaveRequest>> {
  if (isApiMode()) return postLeaveRequest(input);
  try {
    const parsed = createLeaveSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid leave payload", parsed.error.flatten());
    }

    const employeeId = getWorkEmployeeId();
    const schedule = await scheduleRepository.getSyncSafe();
    const holidayDates = new Set(
      schedule.holidays
        .filter((h) => h.type === "holiday")
        .map((h) => h.date)
    );
    const workingDayCount = countWorkingDaysInRange(
      parsed.data.startDate,
      parsed.data.endDate,
      schedule.workingDays,
      holidayDates
    );
    const days = Math.max(workingDayCount, 1);
    const submittedAt = formatISO(demoNow());
    const request = enrichWithAudit(
      {
        id: createId("leave"),
        employeeId,
        type: parsed.data.type,
        status: "pending" as const,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        days,
        reason: parsed.data.reason,
        submittedAt,
      },
      employeeId,
      { createdAt: submittedAt, updatedAt: submittedAt }
    );

    await leaveRepository.create(request);
    const { notifyLeaveSubmitted } = await import(
      "@/services/notification.service"
    );
    void notifyLeaveSubmitted({
      leaveId: request.id,
      employeeId,
      days: request.days,
    });
    return ok(request, "Leave request submitted");
  } catch (error) {
    return fromError(error, emptyLeave(""));
  }
}

/** PATCH /leave/:id/approve */
export async function approveLeave(
  id: string,
  reviewerNote?: string
): Promise<ApiResponse<LeaveRequest>> {
  if (isApiMode()) return patchApproveLeave(id, reviewerNote);
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can approve leave");
    }
    const parsed = reviewLeaveSchema.safeParse({ reviewerNote });
    if (!parsed.success) {
      throw new ValidationError("Invalid review payload", parsed.error.flatten());
    }

    const current = await leaveRepository.findById(id);
    if (!current) throw new NotFoundError("Leave request not found");
    if (current.status !== "pending") {
      throw new ConflictError("Only pending requests can be approved");
    }

    const updated = await leaveRepository.update(
      id,
      touchEntity(current, getSessionUserId(), {
        status: "approved",
        reviewedAt: formatISO(demoNow()),
        reviewerNote: parsed.data.reviewerNote ?? "Approved",
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
          const next = touchEntity(existing, getSessionUserId(), {
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
              getSessionUserId()
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
      actorId: getSessionUserId(),
    });
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
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can reject leave");
    }
    const parsed = reviewLeaveSchema.safeParse({ reviewerNote });
    if (!parsed.success) {
      throw new ValidationError("Invalid review payload", parsed.error.flatten());
    }

    const current = await leaveRepository.findById(id);
    if (!current) throw new NotFoundError("Leave request not found");
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

/** DELETE /leave/:id */
export async function cancelLeaveRequest(
  id: string
): Promise<ApiResponse<LeaveRequest>> {
  if (isApiMode()) return apiDeleteLeave(id);
  try {
    const employeeId = getWorkEmployeeId();
    const items = await leaveRepository.list();
    const current = items.find(
      (r) => r.id === id && r.employeeId === employeeId
    );
    if (!current) throw new NotFoundError("Leave request not found");
    if (current.status !== "pending") {
      throw new ConflictError("Only pending requests can be cancelled");
    }

    await leaveRepository.delete(id, true);
    const { notifyLeaveCancelled } = await import(
      "@/services/notification.service"
    );
    void notifyLeaveCancelled({
      leaveId: current.id,
      employeeId: current.employeeId,
    });
    return ok(current, "Leave request cancelled");
  } catch (error) {
    return fromError(error, emptyLeave(id));
  }
}

// Keep type re-exports for consumers that imported LeaveStatus/LeaveType via filters
export type { LeaveStatus, LeaveType };
