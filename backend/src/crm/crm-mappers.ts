/** Prisma row → frontend DTO mappers for the CRM module. */
import type {
  CrmBusinessType,
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmLeadHistoryEvent,
  CrmStage,
  CrmSubStage,
} from "@prisma/client";
import { auditFields, iso, isoOrNull } from "../common/mappers";

export function mapSubStage(row: CrmSubStage) {
  return {
    id: row.id,
    stageId: row.stageId,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    active: row.active,
    ...auditFields(row),
  };
}

export function mapStage(row: CrmStage, subStages: CrmSubStage[] = []) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    sortOrder: row.sortOrder,
    active: row.active,
    conversionProbability: row.conversionProbability,
    category: row.category,
    subStages: subStages.map(mapSubStage),
    ...auditFields(row),
  };
}

export function mapFeedbackType(row: CrmFeedbackType) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    active: row.active,
    isLossReason: row.isLossReason,
    ...auditFields(row),
  };
}

export function mapBusinessType(row: CrmBusinessType) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    active: row.active,
    ...auditFields(row),
  };
}

export function mapLead(row: CrmLead) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    companyName: row.companyName,
    businessTypeId: row.businessTypeId,
    source: row.source,
    ownerEmployeeId: row.ownerEmployeeId,
    stageId: row.stageId,
    subStageId: row.subStageId,
    status: row.status,
    tags: row.tags,
    nextAction: row.nextAction,
    nextFollowUpAt: isoOrNull(row.nextFollowUpAt),
    lastActivityAt: isoOrNull(row.lastActivityAt),
    lossReasonTypeId: row.lossReasonTypeId,
    notes: row.notes,
    convertedAt: isoOrNull(row.convertedAt),
    ...auditFields(row),
  };
}

export function mapSalesProfileLead(
  row: CrmLead,
  stage: Pick<CrmStage, "name" | "color" | "category"> | null
) {
  return {
    id: row.id,
    name: row.name,
    companyName: row.companyName,
    phone: row.phone,
    source: row.source,
    status: row.status,
    stageId: row.stageId,
    stageName: stage?.name ?? "",
    stageColor: stage?.color ?? "#94a3b8",
    stageCategory: stage?.category ?? "other",
    nextFollowUpAt: isoOrNull(row.nextFollowUpAt),
    ownerEmployeeId: row.ownerEmployeeId,
  };
}

export function mapLeadActivity(row: CrmLeadActivity) {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type,
    title: row.title,
    description: row.description,
    actorEmployeeId: row.actorEmployeeId,
    occurredAt: iso(row.occurredAt),
    ...auditFields(row),
  };
}

export function mapLeadFeedback(row: CrmLeadFeedback) {
  return {
    id: row.id,
    leadId: row.leadId,
    feedbackTypeId: row.feedbackTypeId,
    customerFeedback: row.customerFeedback,
    callAnswered: row.callAnswered,
    nextAction: row.nextAction,
    nextFollowUpAt: isoOrNull(row.nextFollowUpAt),
    meetingMode: row.meetingMode ?? null,
    meetingLocation: row.meetingLocation ?? null,
    notes: row.notes,
    recordedByEmployeeId: row.recordedByEmployeeId,
    ...auditFields(row),
  };
}

export function mapHistory(row: CrmLeadHistoryEvent) {
  return {
    id: row.id,
    leadId: row.leadId,
    action: row.action,
    actorId: row.actorId,
    actorName: row.actorName,
    note: row.note,
    previousValue: row.previousValue,
    newValue: row.newValue,
    ...auditFields(row),
  };
}
