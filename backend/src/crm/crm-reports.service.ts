import { Injectable } from "@nestjs/common";
import { assertCap, type Actor } from "./crm-access";
import { canCrm } from "../lib/crm-policies";
import { CrmDashboardService } from "./crm-dashboard.service";
import { CrmPerformanceService } from "./crm-performance.service";

@Injectable()
export class CrmReportsService {
  constructor(
    private readonly dashboardService: CrmDashboardService,
    private readonly performanceService: CrmPerformanceService
  ) {}

  async reports(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    assertCap(
      actor,
      canCrm(actor.role, "view_reports", actor.permissions)
        ? "view_reports"
        : "view_dashboard"
    );
    const dashboard = await this.dashboardService.dashboard(companyId, actor, query);
    const performance = await this.performanceService.performance(
      companyId,
      actor,
      query
    );
    return {
      generatedAt: new Date().toISOString(),
      kpis: dashboard.kpis,
      stageCards: dashboard.stageCards,
      leadsByStage: dashboard.leadsByStage,
      leadsTrend: dashboard.leadsTrend,
      conversionTrend: dashboard.conversionTrend,
      feedbackReasons: dashboard.feedbackReasons,
      salesPerformance: dashboard.salesPerformance,
      performance,
      needsAttention: dashboard.needsAttention,
      insights: dashboard.insights,
    };
  }
}
