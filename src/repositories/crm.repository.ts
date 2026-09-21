import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import { CollectionRepository } from "@/repositories/base.repository";
import type {
  CrmBusinessType,
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmLeadHistoryEvent,
  CrmStage,
  CrmSubStage,
} from "@/types/crm";

export class CrmStageRepository extends CollectionRepository<CrmStage> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmStages);
  }
}

export class CrmSubStageRepository extends CollectionRepository<CrmSubStage> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmSubStages);
  }
}

export class CrmFeedbackTypeRepository extends CollectionRepository<CrmFeedbackType> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmFeedbackTypes);
  }
}

export class CrmBusinessTypeRepository extends CollectionRepository<CrmBusinessType> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmBusinessTypes);
  }
}

export class CrmLeadRepository extends CollectionRepository<CrmLead> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmLeads);
  }

  /** Live rows, soft-deleted rows, or both. Archived-but-not-deleted stays out of live, matching `findAll`. */
  async findForList(
    mode: "live" | "deleted" | "withDeleted"
  ): Promise<CrmLead[]> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      const live = items.filter((item) => !item.deletedAt && !item.isArchived);
      if (mode === "live") return live;
      const deleted = items.filter((item) => Boolean(item.deletedAt));
      if (mode === "deleted") return deleted;
      return [...live, ...deleted];
    });
  }

  async findIncludingDeleted(id: string): Promise<CrmLead | null> {
    return this.withLatency(async () => {
      const items = await this.readAll();
      return items.find((item) => item.id === id) ?? null;
    });
  }
}

export class CrmLeadActivityRepository extends CollectionRepository<CrmLeadActivity> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmLeadActivities);
  }
}

export class CrmLeadFeedbackRepository extends CollectionRepository<CrmLeadFeedback> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmLeadFeedback);
  }
}

export class CrmLeadHistoryRepository extends CollectionRepository<CrmLeadHistoryEvent> {
  constructor() {
    super(getStorageAdapter(), StorageKeys.crmLeadHistory);
  }
}

export const crmStageRepository = new CrmStageRepository();
export const crmSubStageRepository = new CrmSubStageRepository();
export const crmFeedbackTypeRepository = new CrmFeedbackTypeRepository();
export const crmBusinessTypeRepository = new CrmBusinessTypeRepository();
export const crmLeadRepository = new CrmLeadRepository();
export const crmLeadActivityRepository = new CrmLeadActivityRepository();
export const crmLeadFeedbackRepository = new CrmLeadFeedbackRepository();
export const crmLeadHistoryRepository = new CrmLeadHistoryRepository();
