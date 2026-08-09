import { Injectable } from "@nestjs/common";
import type { Actor } from "./work-mappers";
import { WorkTasksQueryService } from "./work-tasks-query.service";
import { WorkTasksStatusService } from "./work-tasks-status.service";
import { WorkTasksWriteService } from "./work-tasks-write.service";

export type { Actor };

/**
 * Task-related sub-facade extracted from `WorkService`.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class WorkTasksService {
  constructor(
    private readonly query: WorkTasksQueryService,
    private readonly write: WorkTasksWriteService,
    private readonly status: WorkTasksStatusService
  ) {}

  listTasks(
    companyId: string,
    actor: Actor,
    filters: {
      employeeId?: string;
      status?: string;
      priority?: string;
      origin?: string;
    } = {}
  ) {
    return this.query.listTasks(companyId, actor, filters);
  }

  taskById(companyId: string, actor: Actor, id: string) {
    return this.query.taskById(companyId, actor, id);
  }

  createTask(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.write.createTask(companyId, actor, body);
  }

  updateTask(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    return this.status.updateTask(companyId, actor, id, body);
  }

  updateTaskStatus(
    companyId: string,
    actor: Actor,
    id: string,
    status: string,
    evidence?: { links?: string[]; notes?: string }
  ) {
    return this.status.updateTaskStatus(companyId, actor, id, status, evidence);
  }

  toggleSubItem(companyId: string, actor: Actor, id: string, subId: string) {
    return this.write.toggleSubItem(companyId, actor, id, subId);
  }

  deleteTask(companyId: string, actor: Actor, id: string) {
    return this.write.deleteTask(companyId, actor, id);
  }
}
