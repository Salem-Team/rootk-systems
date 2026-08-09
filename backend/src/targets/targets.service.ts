import { Injectable } from "@nestjs/common";
import type { Actor } from "./targets-access";
import { TargetsAssignService } from "./targets-assign.service";
import { TargetsCategoriesService } from "./targets-categories.service";
import { TargetsCrudService } from "./targets-crud.service";
import { TargetsDashboardService } from "./targets-dashboard.service";
import { TargetsDelayedService } from "./targets-delayed.service";
import { TargetsPerformanceService } from "./targets-performance.service";
import { TargetsProgressService } from "./targets-progress.service";
import { TargetsTemplatesService } from "./targets-templates.service";
import { TargetsTypesService } from "./targets-types.service";
import { TargetsWarningsService } from "./targets-warnings.service";

export type { Actor };

/**
 * Thin facade preserving the original `TargetsService` public API.
 * All business logic lives in the domain services below.
 */
@Injectable()
export class TargetsService {
  constructor(
    private readonly categories: TargetsCategoriesService,
    private readonly types: TargetsTypesService,
    private readonly templates: TargetsTemplatesService,
    private readonly crud: TargetsCrudService,
    private readonly assignService: TargetsAssignService,
    private readonly progress: TargetsProgressService,
    private readonly warnings: TargetsWarningsService,
    private readonly delayed: TargetsDelayedService,
    private readonly dashboardService: TargetsDashboardService,
    private readonly performanceService: TargetsPerformanceService
  ) {}

  // ── Categories ──────────────────────────────────────────────────────────

  listCategories(companyId: string) {
    return this.categories.listCategories(companyId);
  }

  upsertCategory(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.categories.upsertCategory(companyId, actor, body);
  }

  deleteCategory(companyId: string, actor: Actor, id: string) {
    return this.categories.deleteCategory(companyId, actor, id);
  }

  // ── Types ───────────────────────────────────────────────────────────────

  listTypes(companyId: string, categoryId?: string) {
    return this.types.listTypes(companyId, categoryId);
  }

  upsertType(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.types.upsertType(companyId, actor, body);
  }

  deleteType(companyId: string, actor: Actor, id: string) {
    return this.types.deleteType(companyId, actor, id);
  }

  // ── Templates ───────────────────────────────────────────────────────────

  listTemplates(companyId: string) {
    return this.templates.listTemplates(companyId);
  }

  upsertTemplate(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.templates.upsertTemplate(companyId, actor, body);
  }

  deleteTemplate(companyId: string, actor: Actor, id: string) {
    return this.templates.deleteTemplate(companyId, actor, id);
  }

  // ── Targets ─────────────────────────────────────────────────────────────

  listTargets(
    companyId: string,
    actor: Actor,
    filters: Record<string, string | undefined> = {}
  ) {
    return this.crud.listTargets(companyId, actor, filters);
  }

  getTarget(companyId: string, actor: Actor, id: string) {
    return this.crud.getTarget(companyId, actor, id);
  }

  assignTarget(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.assignService.assignTarget(companyId, actor, body);
  }

  updateTarget(
    companyId: string,
    actor: Actor,
    id: string,
    body: Record<string, unknown>
  ) {
    return this.progress.updateTarget(companyId, actor, id, body);
  }

  deleteTarget(companyId: string, actor: Actor, id: string) {
    return this.crud.deleteTarget(companyId, actor, id);
  }

  /**
   * Event hook: WorkTask status changed → recalculate linked target.
   * Called from WorkService (no manual % edits).
   */
  onLinkedTaskStatusChanged(companyId: string, taskId: string, actorId: string) {
    return this.progress.onLinkedTaskStatusChanged(companyId, taskId, actorId);
  }

  recalculateTarget(companyId: string, targetId: string, actorId: string) {
    return this.progress.recalculateTarget(companyId, targetId, actorId);
  }

  // ── Warnings ────────────────────────────────────────────────────────────

  listWarnings(
    companyId: string,
    actor: Actor,
    filters: { targetId?: string; employeeId?: string } = {}
  ) {
    return this.warnings.listWarnings(companyId, actor, filters);
  }

  sendWarning(companyId: string, actor: Actor, body: Record<string, unknown>) {
    return this.warnings.sendWarning(companyId, actor, body);
  }

  acknowledgeWarning(companyId: string, actor: Actor, id: string) {
    return this.warnings.acknowledgeWarning(companyId, actor, id);
  }

  // ── Delayed center ──────────────────────────────────────────────────────

  delayedCenter(companyId: string, actor: Actor) {
    return this.delayed.delayedCenter(companyId, actor);
  }

  // ── Dashboard ───────────────────────────────────────────────────────────

  dashboard(companyId: string, actor: Actor) {
    return this.dashboardService.dashboard(companyId, actor);
  }

  employeePerformance(companyId: string, actor: Actor, employeeId: string) {
    return this.performanceService.employeePerformance(companyId, actor, employeeId);
  }
}
