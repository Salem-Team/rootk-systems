import { Injectable } from "@nestjs/common";
import type { Actor, DateRangePreset, TeamActivitySort } from "./organic-ads.helpers";
import { OrganicAdsSettingsService } from "./services/organic-ads-settings.service";
import { OrganicAdsHistoryService } from "./services/organic-ads-history.service";
import { OrganicAdsTaskLinkService } from "./services/organic-ads-task-link.service";
import { OrganicAdsQueryService } from "./services/organic-ads-query.service";
import { OrganicAdsCreateService } from "./services/organic-ads-create.service";
import { OrganicAdsMutationService } from "./services/organic-ads-mutation.service";
import { OrganicAdsOverviewService } from "./services/organic-ads-overview.service";
import { OrganicAdsPerformanceService } from "./services/organic-ads-performance.service";

/**
 * Public Organic Ads API facade — delegates to focused domain services.
 * Keep this as the only import surface for OrganicAdsController and other modules.
 */
@Injectable()
export class OrganicAdsService {
  constructor(
    private readonly settingsService: OrganicAdsSettingsService,
    private readonly historyService: OrganicAdsHistoryService,
    private readonly taskLinkService: OrganicAdsTaskLinkService,
    private readonly queryService: OrganicAdsQueryService,
    private readonly createService: OrganicAdsCreateService,
    private readonly mutationService: OrganicAdsMutationService,
    private readonly overviewService: OrganicAdsOverviewService,
    private readonly performanceService: OrganicAdsPerformanceService
  ) {}

  getSettings(companyId: string) {
    return this.settingsService.getSettings(companyId);
  }

  updateSettings(
    companyId: string,
    actorId: string,
    body: { weeklyTarget?: number; allowDuplicateOverride?: boolean }
  ) {
    return this.settingsService.updateSettings(companyId, actorId, body);
  }

  inspectUrl(companyId: string, actor: Actor, url: string) {
    return this.queryService.inspectUrl(companyId, actor, url);
  }

  listLinkableTasks(companyId: string, actor: Actor, employeeId?: string) {
    return this.taskLinkService.listLinkableTasks(companyId, actor, employeeId);
  }

  list(companyId: string, actor: Actor, filters: Record<string, unknown> = {}) {
    return this.queryService.list(companyId, actor, filters);
  }

  byId(companyId: string, actor: Actor, id: string) {
    return this.queryService.byId(companyId, actor, id);
  }

  create(
    companyId: string,
    actor: Actor,
    body: {
      url: string;
      project?: string;
      campaign?: string;
      notes?: string;
      forceDuplicate?: boolean;
      workTaskId?: string;
      targetId?: string;
      linkToOpenTask?: boolean;
    }
  ) {
    return this.createService.create(companyId, actor, body);
  }

  update(
    companyId: string,
    actor: Actor,
    id: string,
    body: {
      project?: string;
      campaign?: string;
      notes?: string;
      status?: string;
    }
  ) {
    return this.mutationService.update(companyId, actor, id, body);
  }

  remove(companyId: string, actor: Actor, id: string) {
    return this.mutationService.remove(companyId, actor, id);
  }

  getHistory(companyId: string, actor: Actor, limit = 40) {
    return this.historyService.getHistory(companyId, actor, limit);
  }

  getOverview(
    companyId: string,
    actor: Actor,
    range: DateRangePreset = "this_week",
    activitySort: TeamActivitySort = "ads"
  ) {
    return this.overviewService.getOverview(companyId, actor, range, activitySort);
  }

  getSalesPerformance(companyId: string, actor: Actor) {
    return this.performanceService.getSalesPerformance(companyId, actor);
  }

  getSalesProfile(companyId: string, actor: Actor, employeeId: string) {
    return this.performanceService.getSalesProfile(companyId, actor, employeeId);
  }
}
