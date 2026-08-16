import { formatISO } from "date-fns";
import type { CreateLeaveInput, LeaveFilters } from "@/api/contracts";
import {
  deleteLeaveRequest as apiDeleteLeave,
  fetchLeaveById,
  fetchLeaveRequests,
  postLeaveRequest,
} from "@/api/leave.api";
import { isApiMode } from "@/lib/env";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { enrichWithAudit } from "@/lib/entity";
import { createId } from "@/lib/id";
import { demoNow } from "@/lib/mock-date";
import { leaveRepository, scheduleRepository } from "@/repositories";
import { createLeaveSchema } from "@/schemas";
import { fail, fromError, ok } from "@/services/api-result";
import {
  employeeInLocalScope,
  localEmployeeIdsForModule,
} from "@/services/employee-scope";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse, LeaveRequest, LeaveStatus, LeaveType } from "@/types";
import { countWorkingDaysInRange } from "@/lib/working-days";
import { emptyLeave } from "./leave-service-helpers";
import { applyApprovedLeaveLocal } from "./leave-approval";

export type { CreateLeaveInput, LeaveFilters };
export { approveLeave, rejectLeave } from "./leave-approval";

/** GET /leave */
export async function getLeaveRequests(
  filters: LeaveFilters = {}
): Promise<ApiResponse<LeaveRequest[]>> {
  if (isApiMode()) return fetchLeaveRequests(filters);
  try {
    const allowed = await localEmployeeIdsForModule(
      "leave.viewAll",
      "leave.viewTeam"
    );
    if (filters.employeeId && !employeeInLocalScope(filters.employeeId, allowed)) {
      return ok([]);
    }
    const rows = await leaveRepository.filter(
      allowed === null || filters.employeeId
        ? filters
        : { ...filters, employeeId: undefined }
    );
    if (allowed === null || filters.employeeId) return ok(rows);
    return ok(rows.filter((row) => allowed.includes(row.employeeId)));
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
    const allowed = await localEmployeeIdsForModule(
      "leave.viewAll",
      "leave.viewTeam"
    );
    if (!employeeInLocalScope(request.employeeId, allowed)) {
      throw new ForbiddenError("You can only view leave in your team scope");
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

    const { getApprovalRules } = await import("@/services/org.service");
    const rulesRes = await getApprovalRules();
    const leaveRule = rulesRes.success
      ? rulesRes.data.find((r) => r.labelKey === "admin.approvalLeave")
      : undefined;
    const needsApproval = leaveRule?.requiresApproval !== false;

    if (!needsApproval) {
      const autoApproved = await applyApprovedLeaveLocal(
        request.id,
        "Auto-approved (leave approval rule off)"
      );
      return ok(autoApproved, "Leave request auto-approved");
    }

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
