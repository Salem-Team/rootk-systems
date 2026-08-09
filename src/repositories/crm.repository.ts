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
