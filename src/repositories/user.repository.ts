import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type { AppUser, UserRole } from "@/types";

export class UserRepository extends CollectionRepository<AppUser> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.users);
  }

  async findByRole(role: UserRole): Promise<AppUser | null> {
    return this.withLatency(async () => {
      const users = await this.list();
      return users.find((u) => u.role === role && u.isActive) ?? null;
    });
  }

  async findByEmail(
    email: string,
    opts: { includeInactive?: boolean } = {}
  ): Promise<AppUser | null> {
    return this.withLatency(async () => {
      const users = await this.list();
      const needle = email.toLowerCase();
      return (
        users.find((u) => {
          if (u.email.toLowerCase() !== needle) return false;
          if (opts.includeInactive) return true;
          return u.isActive && !u.deletedAt;
        }) ?? null
      );
    });
  }

  /** Login accounts linked to an employee (by employeeId and/or email). */
  async findLinkedToEmployee(
    employeeId: string,
    email?: string
  ): Promise<AppUser[]> {
    return this.withLatency(async () => {
      const users = await this.readAll();
      const needle = email?.trim().toLowerCase();
      const matched = users.filter((u) => {
        if (u.deletedAt) return false;
        if (u.employeeId === employeeId) return true;
        return Boolean(needle && u.email.toLowerCase() === needle);
      });
      const byId = new Map(matched.map((u) => [u.id, u]));
      return [...byId.values()];
    });
  }
}

export const userRepository = new UserRepository();
