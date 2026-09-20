import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { WorkTaskComment } from "@/types/work";

export class WorkTaskCommentRepository extends CollectionRepository<WorkTaskComment> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.workTaskComments);
  }

  async listForTask(taskId: string): Promise<WorkTaskComment[]> {
    return this.withLatency(async () => {
      const all = await this.list();
      return all
        .filter((c) => c.taskId === taskId && !c.deletedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }
}

export const workTaskCommentRepository = new WorkTaskCommentRepository();
