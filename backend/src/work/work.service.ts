import { Injectable } from "@nestjs/common";
import type { Actor } from "./work-mappers";
import { WorkMeetingsService } from "./work-meetings.service";
import { WorkTasksService } from "./work-tasks.service";

export type { Actor };

/**
 * Thin facade preserving the original `WorkService` public API.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class WorkService {
  constructor(
    private readonly tasks: WorkTasksService,
    private readonly meetings: WorkMeetingsService
  ) {}

  // ── Tasks ───────────────────────────────────────────────────────────────

  listTasks(
    companyId: string,
    actor: Actor,
    filters: {
      employeeId?: string;
      status?: string;
      priority?: string;
      origin?: string;
      team?: string;
    } = {}
  ) {
    return this.tasks.listTasks(companyId, actor, filters);
  }

  taskById(companyId: string, actor: Actor, id: string) {
    return this.tasks.taskById(companyId, actor, id);
  }

  createTask(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.tasks.createTask(companyId, actor, body);
  }

  updateTask(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    return this.tasks.updateTask(companyId, actor, id, body);
  }

  updateTaskStatus(
    companyId: string,
    actor: Actor,
    id: string,
    status: string,
    evidence?: { links?: string[]; notes?: string }
  ) {
    return this.tasks.updateTaskStatus(companyId, actor, id, status, evidence);
  }

  toggleSubItem(companyId: string, actor: Actor, id: string, subId: string) {
    return this.tasks.toggleSubItem(companyId, actor, id, subId);
  }

  deleteTask(companyId: string, actor: Actor, id: string) {
    return this.tasks.deleteTask(companyId, actor, id);
  }

  // ── Meetings ────────────────────────────────────────────────────────────

  listMeetings(
    companyId: string,
    actor: Actor,
    filters: {
      employeeId?: string;
      date?: string;
      from?: string;
      to?: string;
    } = {}
  ) {
    return this.meetings.listMeetings(companyId, actor, filters);
  }

  createMeeting(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    return this.meetings.createMeeting(companyId, actor, body);
  }

  updateMeeting(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    return this.meetings.updateMeeting(companyId, actor, id, body);
  }

  deleteMeeting(companyId: string, actor: Actor, id: string) {
    return this.meetings.deleteMeeting(companyId, actor, id);
  }
}
