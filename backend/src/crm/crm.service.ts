import { Injectable } from "@nestjs/common";
import type { Actor } from "./crm-access";
import { CrmActivitiesService } from "./crm-activities.service";
import { CrmBusinessTypesService } from "./crm-business-types.service";
import { CrmDashboardService } from "./crm-dashboard.service";
import { CrmFeedbackTypesService } from "./crm-feedback-types.service";
import { CrmLeadCreateService } from "./crm-lead-create.service";
import { CrmLeadUpdateService } from "./crm-lead-update.service";
import { CrmLeadsImportService } from "./crm-leads-import.service";
import { CrmLeadsService } from "./crm-leads.service";
import { CrmPerformanceService } from "./crm-performance.service";
import { CrmReportsService } from "./crm-reports.service";
import { CrmStagesService } from "./crm-stages.service";
import { CrmSubStagesService } from "./crm-sub-stages.service";

export type { Actor };

/**
 * Thin facade preserving the original `CrmService` public API.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class CrmService {
  constructor(
    private readonly stages: CrmStagesService,
    private readonly subStages: CrmSubStagesService,
    private readonly feedbackTypes: CrmFeedbackTypesService,
    private readonly businessTypes: CrmBusinessTypesService,
    private readonly leads: CrmLeadsService,
    private readonly leadCreate: CrmLeadCreateService,
    private readonly leadUpdate: CrmLeadUpdateService,
    private readonly leadImport: CrmLeadsImportService,
    private readonly activities: CrmActivitiesService,
    private readonly dashboardService: CrmDashboardService,
    private readonly performanceService: CrmPerformanceService,
    private readonly reportsService: CrmReportsService
  ) {}

  // ── Stages ──────────────────────────────────────────────────────────────

  listStages(companyId: string) {
    return this.stages.listStages(companyId);
  }

  upsertStage(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.stages.upsertStage(companyId, actor, body);
  }

  reorderStages(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.stages.reorderStages(companyId, actor, body);
  }

  deleteStage(companyId: string, actor: Actor, id: string, moveToStageId?: string) {
    return this.stages.deleteStage(companyId, actor, id, moveToStageId);
  }

  // ── Sub-stages ──────────────────────────────────────────────────────────

  upsertSubStage(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.subStages.upsertSubStage(companyId, actor, body);
  }

  reorderSubStages(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    return this.subStages.reorderSubStages(companyId, actor, body);
  }

  deleteSubStage(companyId: string, actor: Actor, id: string) {
    return this.subStages.deleteSubStage(companyId, actor, id);
  }

  // ── Feedback types ──────────────────────────────────────────────────────

  listFeedbackTypes(companyId: string) {
    return this.feedbackTypes.listFeedbackTypes(companyId);
  }

  upsertFeedbackType(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    return this.feedbackTypes.upsertFeedbackType(companyId, actor, body);
  }

  deleteFeedbackType(companyId: string, actor: Actor, id: string) {
    return this.feedbackTypes.deleteFeedbackType(companyId, actor, id);
  }

  // ── Business types ──────────────────────────────────────────────────────

  listBusinessTypes(companyId: string) {
    return this.businessTypes.listBusinessTypes(companyId);
  }

  upsertBusinessType(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    return this.businessTypes.upsertBusinessType(companyId, actor, body);
  }

  deleteBusinessType(companyId: string, actor: Actor, id: string) {
    return this.businessTypes.deleteBusinessType(companyId, actor, id);
  }

  // ── Leads ───────────────────────────────────────────────────────────────

  listLeads(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    return this.leads.listLeads(companyId, actor, query);
  }

  getLead(companyId: string, actor: Actor, id: string) {
    return this.leads.getLead(companyId, actor, id);
  }

  createLead(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.leadCreate.createLead(companyId, actor, body);
  }

  updateLead(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    return this.leadUpdate.updateLead(companyId, actor, id, body);
  }

  deleteLead(companyId: string, actor: Actor, id: string) {
    return this.leads.deleteLead(companyId, actor, id);
  }

  bulkLeads(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.leads.bulkLeads(companyId, actor, body);
  }

  importLeads(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.leadImport.importLeads(companyId, actor, body);
  }

  exportLeads(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    return this.leadImport.exportLeads(companyId, actor, query);
  }

  addActivity(
    companyId: string,
    actor: Actor,
    leadId: string,
    body: Record<string, unknown>
  ) {
    return this.activities.addActivity(companyId, actor, leadId, body);
  }

  getTimeline(companyId: string, actor: Actor, leadId: string) {
    return this.activities.getTimeline(companyId, actor, leadId);
  }

  addFeedback(
    companyId: string,
    actor: Actor,
    leadId: string,
    body: Record<string, unknown>
  ) {
    return this.activities.addFeedback(companyId, actor, leadId, body);
  }

  // ── Analytics ───────────────────────────────────────────────────────────

  dashboard(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    return this.dashboardService.dashboard(companyId, actor, query);
  }

  performance(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    return this.performanceService.performance(companyId, actor, query);
  }

  performanceProfile(companyId: string, actor: Actor, employeeId: string) {
    return this.performanceService.performanceProfile(companyId, actor, employeeId);
  }

  listRecentActivities(
    companyId: string,
    actor: Actor,
    page = 1,
    pageSize = 20
  ) {
    return this.activities.listRecentActivities(companyId, actor, page, pageSize);
  }

  listFeedback(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    return this.activities.listFeedback(companyId, actor, query);
  }

  reports(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    return this.reportsService.reports(companyId, actor, query);
  }
}
