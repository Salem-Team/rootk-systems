import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/types";

export interface LeaveFilter {
  employeeId?: string;
  status?: LeaveStatus;
  type?: LeaveType;
}

export class LeaveRepository extends CollectionRepository<LeaveRequest> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.leave);
  }

  async filter(filters: LeaveFilter = {}): Promise<LeaveRequest[]> {
    return this.withLatency(async () => {
      let results = await this.list();

      if (filters.employeeId) {
        results = results.filter((r) => r.employeeId === filters.employeeId);
      }
      if (filters.status) {
        results = results.filter((r) => r.status === filters.status);
      }
      if (filters.type) {
        results = results.filter((r) => r.type === filters.type);
      }

      return results.sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    });
  }
}

export const leaveRepository = new LeaveRepository();
