import type { CreateLeaveInput, LeaveFilters } from "@/api/contracts";
import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, LeaveRequest } from "@/types";

function emptyLeave(id = ""): LeaveRequest {
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
export function fetchLeaveRequests(
  filters: LeaveFilters = {}
): Promise<ApiResponse<LeaveRequest[]>> {
  return api.getList(
    `${API_ROUTES.leave.root}${toQuery({
      employeeId: filters.employeeId,
      status: filters.status,
      type: filters.type,
      page: filters.page,
      pageSize: filters.pageSize,
      cursor: filters.cursor,
    })}`
  );
}

/** GET /leave/:id */
export function fetchLeaveById(
  id: string
): Promise<ApiResponse<LeaveRequest | null>> {
  return api.get(API_ROUTES.leave.byId(id), null);
}

/** POST /leave */
export function postLeaveRequest(
  input: CreateLeaveInput
): Promise<ApiResponse<LeaveRequest>> {
  return api.post(API_ROUTES.leave.root, input, emptyLeave());
}

/** PATCH /leave/:id/approve */
export function patchApproveLeave(
  id: string,
  reviewerNote?: string
): Promise<ApiResponse<LeaveRequest>> {
  return api.patch(
    API_ROUTES.leave.approve(id),
    { reviewerNote },
    emptyLeave(id)
  );
}

/** PATCH /leave/:id/reject */
export function patchRejectLeave(
  id: string,
  reviewerNote?: string
): Promise<ApiResponse<LeaveRequest>> {
  return api.patch(
    API_ROUTES.leave.reject(id),
    { reviewerNote },
    emptyLeave(id)
  );
}

/** DELETE /leave/:id */
export function deleteLeaveRequest(
  id: string
): Promise<ApiResponse<LeaveRequest>> {
  return api.delete(API_ROUTES.leave.byId(id), emptyLeave(id));
}
