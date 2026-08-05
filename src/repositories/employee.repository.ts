import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { Department, Employee, EmployeeStatus } from "@/types";

export interface EmployeeFilter {
  query?: string;
  department?: Department;
  status?: EmployeeStatus;
  location?: string;
}

export class EmployeeRepository extends CollectionRepository<Employee> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.employees);
  }

  async search(filters: EmployeeFilter = {}): Promise<Employee[]> {
    return this.withLatency(async () => {
      let results = await this.list();

      if (filters.query) {
        const q = filters.query.toLowerCase().trim();
        results = results.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.employeeId.toLowerCase().includes(q) ||
            e.position.toLowerCase().includes(q)
        );
      }
      if (filters.department) {
        results = results.filter((e) => e.department === filters.department);
      }
      if (filters.status) {
        results = results.filter((e) => e.status === filters.status);
      }
      if (filters.location) {
        const loc = filters.location.toLowerCase();
        results = results.filter((e) => e.location.toLowerCase().includes(loc));
      }

      return results.sort((a, b) => a.name.localeCompare(b.name));
    });
  }
}

export const employeeRepository = new EmployeeRepository();
