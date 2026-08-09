import { isApiMode } from "@/lib/env";
import { touchEntity } from "@/lib/entity";
import { todayKey } from "@/lib/mock-date";
import { employeeRepository, leaveRepository } from "@/repositories";
import type { Employee, EmployeeStatus } from "@/types";

export function emptyEmployee(): Employee {
  return {
    id: "",
    employeeId: "",
    name: "",
    email: "",
    phone: "",
    department: "Engineering",
    position: "",
    status: "inactive",
    joinDate: "",
    location: "",
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

/**
 * Keep employee.status aligned with approved leave covering today.
 * Restores `active` after leave ends; sets `on_leave` while it covers today.
 */
export async function syncEmployeeLeaveStatuses(): Promise<void> {
  if (isApiMode()) return;
  try {
    const today = todayKey();
    const [employees, leaves] = await Promise.all([
      employeeRepository.list(),
      leaveRepository.list(),
    ]);
    for (const emp of employees) {
      if (emp.deletedAt || emp.status === "inactive") continue;
      const onLeaveToday = leaves.some(
        (l) =>
          l.employeeId === emp.id &&
          l.status === "approved" &&
          l.startDate <= today &&
          l.endDate >= today
      );
      const desired: EmployeeStatus = onLeaveToday ? "on_leave" : "active";
      if (emp.status === desired) continue;
      if (emp.status !== "active" && emp.status !== "on_leave") continue;
      await employeeRepository.mutate(emp.id, (current) =>
        touchEntity(current, "system", { status: desired })
      );
    }
  } catch {
    /* best-effort */
  }
}
