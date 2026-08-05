import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { AttendanceRecord, AttendanceStatus } from "@/types";

export interface AttendanceFilter {
  employeeId?: string;
  date?: string;
  status?: AttendanceStatus;
  from?: string;
  to?: string;
}

export class AttendanceRepository extends CollectionRepository<AttendanceRecord> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.attendance);
  }

  async filter(filters: AttendanceFilter = {}): Promise<AttendanceRecord[]> {
    return this.withLatency(async () => {
      let results = await this.list();

      if (filters.employeeId) {
        results = results.filter((r) => r.employeeId === filters.employeeId);
      }
      if (filters.date) {
        results = results.filter((r) => r.date === filters.date);
      }
      if (filters.status) {
        results = results.filter((r) => r.status === filters.status);
      }
      if (filters.from) {
        results = results.filter((r) => r.date >= filters.from!);
      }
      if (filters.to) {
        results = results.filter((r) => r.date <= filters.to!);
      }

      return results.sort((a, b) => {
        if (a.date === b.date) return a.employeeId.localeCompare(b.employeeId);
        return b.date.localeCompare(a.date);
      });
    });
  }

  async findByEmployeeAndDate(
    employeeId: string,
    date: string
  ): Promise<AttendanceRecord | null> {
    return this.withLatency(async () => {
      const items = await this.list();
      return (
        items.find((r) => r.employeeId === employeeId && r.date === date) ?? null
      );
    });
  }
}

export const attendanceRepository = new AttendanceRepository();
