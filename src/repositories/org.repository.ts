import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type {
  ApprovalRule,
  JobPosition,
  OfficeLocation,
  ShiftDefinition,
} from "@/types/org";

class LocationsRepository extends CollectionRepository<OfficeLocation> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.locations);
  }

  async list(): Promise<OfficeLocation[]> {
    return this.findAll();
  }

  async upsert(
    input: Omit<OfficeLocation, keyof import("@/types").BaseEntity> &
      Partial<import("@/types").BaseEntity>,
    actorId = "system"
  ): Promise<OfficeLocation> {
    const existing = input.id ? await this.findById(input.id) : null;
    if (existing) {
      const next = touchEntity(existing, actorId, {
        name: input.name,
        city: input.city,
        address: input.address,
        timezone: input.timezone,
        capacity: input.capacity,
        workingDays: input.workingDays,
        active: input.active ?? existing.active,
      });
      await this.update(existing.id, next);
      return next;
    }
    const created = enrichWithAudit(
      {
        id: input.id || createId("loc"),
        name: input.name,
        city: input.city,
        address: input.address,
        timezone: input.timezone,
        capacity: input.capacity,
        workingDays: input.workingDays,
        active: input.active ?? true,
      },
      actorId
    );
    return this.create(created);
  }
}

class PositionsRepository extends CollectionRepository<JobPosition> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.positions);
  }

  async list(): Promise<JobPosition[]> {
    return this.findAll();
  }

  async upsert(
    input: Omit<JobPosition, keyof import("@/types").BaseEntity> &
      Partial<import("@/types").BaseEntity>,
    actorId = "system"
  ): Promise<JobPosition> {
    const existing = input.id ? await this.findById(input.id) : null;
    if (existing) {
      const next = touchEntity(existing, actorId, {
        title: input.title,
        department: input.department,
        grade: input.grade,
        reportsTo: input.reportsTo,
        active: input.active ?? existing.active,
      });
      await this.update(existing.id, next);
      return next;
    }
    const created = enrichWithAudit(
      {
        id: input.id || createId("pos"),
        title: input.title,
        department: input.department,
        grade: input.grade,
        reportsTo: input.reportsTo,
        active: input.active ?? true,
      },
      actorId
    );
    return this.create(created);
  }
}

class ShiftsRepository extends CollectionRepository<ShiftDefinition> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.shifts);
  }

  async list(): Promise<ShiftDefinition[]> {
    return this.findAll();
  }

  async upsert(
    input: Omit<ShiftDefinition, keyof import("@/types").BaseEntity> &
      Partial<import("@/types").BaseEntity>,
    actorId = "system"
  ): Promise<ShiftDefinition> {
    const existing = input.id ? await this.findById(input.id) : null;
    if (existing) {
      const next = touchEntity(existing, actorId, {
        name: input.name,
        type: input.type,
        start: input.start,
        end: input.end,
        color: input.color,
        active: input.active ?? existing.active,
        nameKey: input.nameKey ?? existing.nameKey,
      });
      await this.update(existing.id, next);
      return next;
    }
    const created = enrichWithAudit(
      {
        id: input.id || createId("sh"),
        name: input.name,
        nameKey: input.nameKey,
        type: input.type,
        start: input.start,
        end: input.end,
        color: input.color,
        active: input.active ?? true,
      },
      actorId
    );
    return this.create(created);
  }
}

class ApprovalsRepository extends CollectionRepository<ApprovalRule> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.approvalRules);
  }

  async list(): Promise<ApprovalRule[]> {
    return this.findAll();
  }

  async setRequiresApproval(
    id: string,
    requiresApproval: boolean,
    actorId = "system"
  ): Promise<ApprovalRule | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const next = touchEntity(existing, actorId, { requiresApproval });
    await this.update(id, next);
    return next;
  }
}

export const locationsRepository = new LocationsRepository();
export const positionsRepository = new PositionsRepository();
export const shiftsRepository = new ShiftsRepository();
export const approvalsRepository = new ApprovalsRepository();
