import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { WorkProject } from "@/types/work-project";

export interface WorkTaskFilter {
  employeeId?: string;
  status?: TaskStatus;
}

export interface WorkMeetingFilter {
  employeeId?: string;
  date?: string;
}

export class WorkTaskRepository extends CollectionRepository<WorkTask> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.workTasks);
  }

  async filter(filters: WorkTaskFilter = {}): Promise<WorkTask[]> {
    return this.withLatency(async () => {
      let results = await this.list();
      if (filters.employeeId) {
        results = results.filter((t) =>
          t.assigneeIds.includes(filters.employeeId!)
        );
      }
      if (filters.status) {
        results = results.filter((t) => t.status === filters.status);
      }
      return results.sort((a, b) => {
        const aKey = a.createdAt || a.assignedAt || "";
        const bKey = b.createdAt || b.assignedAt || "";
        if (aKey && bKey && aKey !== bKey) return bKey.localeCompare(aKey);
        if (aKey && !bKey) return -1;
        if (!aKey && bKey) return 1;
        return b.id.localeCompare(a.id);
      });
    });
  }
}

export class WorkMeetingRepository extends CollectionRepository<WorkMeeting> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.workMeetings);
  }

  async filter(filters: WorkMeetingFilter = {}): Promise<WorkMeeting[]> {
    return this.withLatency(async () => {
      let results = await this.list();
      if (filters.employeeId) {
        const id = filters.employeeId;
        results = results.filter(
          (m) => m.participantIds.includes(id) || m.organizerId === id
        );
      }
      if (filters.date) {
        results = results.filter((m) => m.date === filters.date);
      }
      return results.sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      );
    });
  }
}

export class WorkProjectRepository extends CollectionRepository<WorkProject> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.workProjects);
  }

  async listRecent(): Promise<WorkProject[]> {
    const rows = await this.findAll();
    return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export const workTaskRepository = new WorkTaskRepository();
export const workMeetingRepository = new WorkMeetingRepository();
export const workProjectRepository = new WorkProjectRepository();
