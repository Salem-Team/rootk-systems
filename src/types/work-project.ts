import type { BaseEntity } from "@/types";
import type { TaskPriority, TaskStatus } from "@/types/work";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type ProjectPhaseStatus = "upcoming" | "active" | "done";

export interface WorkProjectTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO date YYYY-MM-DD — empty when unset. */
  dueDate: string;
  estimateMin: number;
  assigneeIds: string[];
  /** Real work-task id once the row is promoted into the task system. */
  workTaskId?: string;
}

export interface WorkProjectPhase {
  id: string;
  name: string;
  description: string;
  status: ProjectPhaseStatus;
  startDate: string;
  endDate: string;
  tasks: WorkProjectTask[];
}

export interface WorkProject extends BaseEntity {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  leadId: string;
  memberIds: string[];
  phases: WorkProjectPhase[];
}
