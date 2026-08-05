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

  async findByEmail(email: string): Promise<AppUser | null> {
    return this.withLatency(async () => {
      const users = await this.list();
      return (
        users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.isActive
        ) ?? null
      );
    });
  }
}

export const userRepository = new UserRepository();
