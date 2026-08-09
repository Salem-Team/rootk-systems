import type { LeaveRequest } from "@/types";

export function emptyLeave(id: string): LeaveRequest {
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
