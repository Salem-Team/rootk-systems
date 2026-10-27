import { sortTasksNewestFirst, taskDueBucket } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type { TaskPriority, TaskStatus, WorkTask } from "@/types/work";

export type TaskListStatusFilter =
  | "all"
  | "open"
  | TaskStatus
  | "overdue";

export type TaskListPriorityFilter = "all" | TaskPriority;

export type TaskListFilters = {
  query: string;
  status: TaskListStatusFilter;
  priority: TaskListPriorityFilter;
  assigneeId: string;
};

export type TaskListFacets = {
  resultCount: number;
  byStatus: Record<TaskListStatusFilter, number>;
  byPriority: Record<TaskListPriorityFilter, number>;
  byAssignee: Record<string, number>;
};

const STATUS_KEYS: TaskListStatusFilter[] = [
  "all",
  "open",
  "todo",
  "in_progress",
  "completed",
  "overdue",
];

const PRIORITY_KEYS: TaskListPriorityFilter[] = [
  "all",
  "high",
  "medium",
  "low",
];

const PRIORITY_NEEDLES: Record<TaskPriority, string[]> = {
  high: ["high", "عالي", "عالية", "urgent", "مهم"],
  medium: ["medium", "متوسط", "متوسطة", "normal"],
  low: ["low", "منخفض", "منخفضة"],
};

const STATUS_NEEDLES: Record<TaskStatus, string[]> = {
  todo: ["todo", "to do", "جديد", "للتنفيذ", "مفتوحة"],
  in_progress: ["in progress", "progress", "جاري", "قيد التنفيذ", "شغال"],
  completed: ["completed", "done", "مكتمل", "خلصت", "منتهي"],
};

function emptyStatusCounts(): Record<TaskListStatusFilter, number> {
  return {
    all: 0,
    open: 0,
    todo: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  };
}

function emptyPriorityCounts(): Record<TaskListPriorityFilter, number> {
  return { all: 0, high: 0, medium: 0, low: 0 };
}

export function emptyTaskListFacets(): TaskListFacets {
  return {
    resultCount: 0,
    byStatus: emptyStatusCounts(),
    byPriority: emptyPriorityCounts(),
    byAssignee: {},
  };
}

export function hasActiveTaskListFilters(filters: TaskListFilters): boolean {
  return Boolean(
    filters.query.trim() ||
      filters.status !== "all" ||
      filters.priority !== "all" ||
      filters.assigneeId
  );
}

function assigneeNames(
  task: WorkTask,
  employeeMap: Map<string, Employee>
): string {
  return task.assigneeIds
    .map((id) => employeeMap.get(id)?.name ?? "")
    .join(" ")
    .toLowerCase();
}

/** Match free-text search across title, tag, people, priority, and status. */
export function taskMatchesQuery(
  task: WorkTask,
  query: string,
  employeeMap: Map<string, Employee>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    task.title,
    task.description,
    task.tag,
    assigneeNames(task, employeeMap),
    ...(PRIORITY_NEEDLES[task.priority] ?? []),
    ...(STATUS_NEEDLES[task.status] ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesStatus(task: WorkTask, status: TaskListStatusFilter): boolean {
  if (status === "all") return true;
  if (status === "overdue") {
    return taskDueBucket(task.dueDate, task.status) === "overdue";
  }
  if (status === "open") return task.status !== "completed";
  return task.status === status;
}

function matchesPriority(
  task: WorkTask,
  priority: TaskListPriorityFilter
): boolean {
  if (priority === "all") return true;
  return task.priority === priority;
}

function matchesAssignee(task: WorkTask, assigneeId: string): boolean {
  if (!assigneeId) return true;
  return task.assigneeIds.includes(assigneeId);
}

export function filterWorkTasks(
  tasks: WorkTask[],
  filters: TaskListFilters,
  employeeMap: Map<string, Employee>
): WorkTask[] {
  const filtered = tasks.filter(
    (task) =>
      matchesAssignee(task, filters.assigneeId) &&
      matchesStatus(task, filters.status) &&
      matchesPriority(task, filters.priority) &&
      taskMatchesQuery(task, filters.query, employeeMap)
  );
  return sortTasksNewestFirst(filtered);
}

function withoutKey<T extends TaskListFilters, K extends keyof TaskListFilters>(
  filters: T,
  key: K
): TaskListFilters {
  if (key === "query") return { ...filters, query: "" };
  if (key === "status") return { ...filters, status: "all" };
  if (key === "priority") return { ...filters, priority: "all" };
  if (key === "assigneeId") return { ...filters, assigneeId: "" };
  return filters;
}

/** Facet counts for each control after applying the other active filters. */
export function computeTaskListFacets(
  tasks: WorkTask[],
  filters: TaskListFilters,
  employeeMap: Map<string, Employee>
): TaskListFacets {
  const base = filterWorkTasks(tasks, filters, employeeMap);
  const facets = emptyTaskListFacets();
  facets.resultCount = base.length;

  for (const status of STATUS_KEYS) {
    facets.byStatus[status] = filterWorkTasks(
      tasks,
      { ...withoutKey(filters, "status"), status },
      employeeMap
    ).length;
  }

  for (const priority of PRIORITY_KEYS) {
    facets.byPriority[priority] = filterWorkTasks(
      tasks,
      { ...withoutKey(filters, "priority"), priority },
      employeeMap
    ).length;
  }

  const assigneePool = filterWorkTasks(
    tasks,
    withoutKey(filters, "assigneeId"),
    employeeMap
  );
  for (const task of assigneePool) {
    for (const id of task.assigneeIds) {
      facets.byAssignee[id] = (facets.byAssignee[id] ?? 0) + 1;
    }
  }

  return facets;
}
