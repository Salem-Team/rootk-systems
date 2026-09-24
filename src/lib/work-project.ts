import { createId } from "@/lib/id";
import type { TaskPriority, TaskStatus } from "@/types/work";
import type {
  ProjectPhaseStatus,
  ProjectStatus,
  WorkProject,
  WorkProjectPhase,
  WorkProjectTask,
} from "@/types/work-project";

export interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  leadId: string;
  memberIds: string[];
  phases: WorkProjectPhase[];
}

const PHASE_STATUSES = new Set<ProjectPhaseStatus>([
  "upcoming",
  "active",
  "done",
]);
const TASK_STATUSES = new Set<TaskStatus>(["todo", "in_progress", "completed"]);
const PRIORITIES = new Set<TaskPriority>(["high", "medium", "low"]);

export function emptyWorkProject(id = ""): WorkProject {
  return {
    id,
    name: "",
    description: "",
    status: "planning",
    startDate: "",
    endDate: "",
    leadId: "",
    memberIds: [],
    phases: [],
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

export function emptyProjectPhase(): WorkProjectPhase {
  return {
    id: createId("ph"),
    name: "",
    description: "",
    status: "upcoming",
    startDate: "",
    endDate: "",
    tasks: [],
  };
}

export function emptyProjectTask(): WorkProjectTask {
  return {
    id: createId("pt"),
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    estimateMin: 0,
    assigneeIds: [],
  };
}

export function emptyProjectForm(leadId = ""): ProjectFormState {
  return {
    name: "",
    description: "",
    status: "planning",
    startDate: "",
    endDate: "",
    leadId,
    memberIds: leadId ? [leadId] : [],
    phases: [emptyProjectPhase()],
  };
}

export function projectToForm(project: WorkProject): ProjectFormState {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    leadId: project.leadId,
    memberIds: [...project.memberIds],
    phases: project.phases.map((phase) => ({
      ...phase,
      tasks: phase.tasks.map((task) => ({
        ...task,
        assigneeIds: [...task.assigneeIds],
      })),
    })),
  };
}

export function summarizePhases(phases: WorkProjectPhase[]) {
  let tasks = 0;
  let done = 0;
  let minutes = 0;
  for (const phase of phases) {
    for (const task of phase.tasks) {
      if (!task.title.trim()) continue;
      tasks += 1;
      minutes += Math.max(0, Math.round(task.estimateMin || 0));
      if (task.status === "completed") done += 1;
    }
  }
  return {
    tasks,
    done,
    minutes,
    phases: phases.filter((phase) => phase.name.trim()).length,
    pct: tasks ? Math.round((done / tasks) * 100) : 0,
  };
}

export function datesInOrder(start: string, end: string): boolean {
  if (!start || !end) return true;
  return end >= start;
}

/** A range is the two days, whichever box they were typed in. */
export function orderedDateRange(start: string, end: string): {
  start: string;
  end: string;
} {
  const from = String(start ?? "").slice(0, 10);
  const to = String(end ?? "").slice(0, 10);
  if (from && to && to < from) return { start: to, end: from };
  return { start: from, end: to };
}

export function projectFormIssue(
  form: ProjectFormState
):
  | "workAdmin.projects.validationName"
  | "workAdmin.projects.validationLead"
  | "workAdmin.projects.validationPhase"
  | null {
  if (!form.name.trim()) return "workAdmin.projects.validationName";
  if (!form.leadId.trim()) return "workAdmin.projects.validationLead";
  const unnamedWithTasks = form.phases.some(
    (phase) =>
      !phase.name.trim() && phase.tasks.some((task) => task.title.trim())
  );
  if (unnamedWithTasks) return "workAdmin.projects.validationPhase";
  return null;
}

function asPhaseStatus(value: string): ProjectPhaseStatus {
  return PHASE_STATUSES.has(value as ProjectPhaseStatus)
    ? (value as ProjectPhaseStatus)
    : "upcoming";
}

function asTaskStatus(value: string): TaskStatus {
  return TASK_STATUSES.has(value as TaskStatus)
    ? (value as TaskStatus)
    : "todo";
}

function asPriority(value: string): TaskPriority {
  return PRIORITIES.has(value as TaskPriority)
    ? (value as TaskPriority)
    : "medium";
}

/** Lead, team member, or owner of a task inside the project. */
export function projectIncludesEmployee(
  project: Pick<WorkProject, "leadId" | "memberIds" | "phases">,
  employeeId: string
): boolean {
  if (!employeeId) return false;
  if (project.leadId === employeeId || project.memberIds.includes(employeeId)) {
    return true;
  }
  return project.phases.some((phase) =>
    phase.tasks.some((task) => task.assigneeIds.includes(employeeId))
  );
}

/** Drop blank rows and keep task owners inside the project team. */
export function normalizeProjectForm(form: ProjectFormState): ProjectFormState | null {
  const name = form.name.trim();
  const leadId = form.leadId.trim();
  if (!name || !leadId) return null;
  const projectDates = orderedDateRange(form.startDate, form.endDate);
  const memberIds = Array.from(
    new Set([leadId, ...form.memberIds.map((id) => id.trim())].filter(Boolean))
  );
  const allowed = new Set(memberIds);
  const phases: WorkProjectPhase[] = [];
  for (const phase of form.phases) {
    const phaseName = phase.name.trim();
    const tasks = phase.tasks
      .map((task) => ({
        ...task,
        title: task.title.trim(),
        description: task.description.trim(),
        status: asTaskStatus(task.status),
        priority: asPriority(task.priority),
        dueDate: String(task.dueDate ?? "").slice(0, 10),
        estimateMin: Math.max(0, Math.round(Number(task.estimateMin) || 0)),
        assigneeIds: task.assigneeIds.filter((id) => allowed.has(id)).slice(0, 1),
      }))
      .filter((task) => task.title);
    if (!phaseName && tasks.length > 0) return null;
    if (!phaseName) continue;
    const phaseDates = orderedDateRange(phase.startDate, phase.endDate);
    phases.push({
      ...phase,
      name: phaseName,
      description: phase.description.trim(),
      status: asPhaseStatus(phase.status),
      startDate: phaseDates.start,
      endDate: phaseDates.end,
      tasks,
    });
  }
  return {
    name,
    description: form.description.trim(),
    status: form.status,
    startDate: projectDates.start,
    endDate: projectDates.end,
    leadId,
    memberIds,
    phases,
  };
}
