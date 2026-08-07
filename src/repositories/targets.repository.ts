import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetHistoryEvent,
  TargetTemplate,
  TargetType,
  TargetWarning,
} from "@/types";

export class TargetCategoryRepository extends CollectionRepository<TargetCategory> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.targetCategories);
  }
}

export class TargetTypeRepository extends CollectionRepository<TargetType> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.targetTypes);
  }

  async byCategory(categoryId: string): Promise<TargetType[]> {
    const all = await this.findAll();
    return all
      .filter((t) => t.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
}

export class TargetTemplateRepository extends CollectionRepository<TargetTemplate> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.targetTemplates);
  }
}

export class PerformanceTargetRepository extends CollectionRepository<PerformanceTarget> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.performanceTargets);
  }
}

export class TargetWarningRepository extends CollectionRepository<TargetWarning> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.targetWarnings);
  }
}

export class TargetHistoryRepository extends CollectionRepository<TargetHistoryEvent> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.targetHistory);
  }
}

export const targetCategoryRepository = new TargetCategoryRepository();
export const targetTypeRepository = new TargetTypeRepository();
export const targetTemplateRepository = new TargetTemplateRepository();
export const performanceTargetRepository = new PerformanceTargetRepository();
export const targetWarningRepository = new TargetWarningRepository();
export const targetHistoryRepository = new TargetHistoryRepository();
