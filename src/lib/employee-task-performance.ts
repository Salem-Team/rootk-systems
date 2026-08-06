import type { WorkTask } from "@/types/work";

export interface EmployeeTaskPerformance {
  /** Tasks assigned since hire date. */
  total: number;
  completed: number;
  incomplete: number;
  /** Completion rate 0–100 (one decimal). */
  rate: number;
  /** Hire date (YYYY-MM-DD) used as the window start. */
  since: string;
}

/**
 * Task performance for one employee from join date through now.
 * Uses `Employee.id` in `assigneeIds` (not the HR code).
 */
export function computeEmployeeTaskPerformance(
  tasks: WorkTask[],
  employeeId: string,
  joinDate: string
): EmployeeTaskPerformance {
  const since = joinDate.slice(0, 10);
  const scoped = tasks.filter((task) => {
    if (task.deletedAt) return false;
    if (!task.assigneeIds.includes(employeeId)) return false;
    const created = (task.createdAt || "").slice(0, 10);
    if (created && since && created < since) return false;
    return true;
  });

  const total = scoped.length;
  const completed = scoped.filter((t) => t.status === "completed").length;
  const incomplete = total - completed;
  const rate =
    total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

  return { total, completed, incomplete, rate, since };
}
