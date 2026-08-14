import { Controller, UseGuards, Get, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DashboardService } from "./dashboard.service";
import { CompanyId } from "../common/tenant";
import { RequirePermission } from "../common/permissions.decorator";
import { RolesGuard } from "../common/roles.guard";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("dashboard/stats")
  @RequirePermission("dashboard.view", "dashboard.viewCompanyStats")
  stats(@CompanyId() companyId: string) {
    return this.service.stats(companyId);
  }

  @Get("dashboard/summary")
  @RequirePermission("dashboard.view")
  summary(@CompanyId() companyId: string) {
    return this.service.summary(companyId);
  }

  @Get("reports/weekly")
  @RequirePermission("reports.viewWeekly")
  weekly(@CompanyId() companyId: string) {
    return this.service.weekly(companyId);
  }

  @Get("reports/monthly")
  @RequirePermission("reports.viewMonthly")
  monthly(@CompanyId() companyId: string) {
    return this.service.monthly(companyId);
  }

  @Get("activities")
  @RequirePermission("dashboard.view", "dashboard.viewCompanyStats")
  activities(@CompanyId() companyId: string, @Query("limit") limit?: string) {
    return this.service.activities(companyId, limit ? Number(limit) : 20);
  }

  @Get("announcements")
  @RequirePermission("dashboard.view", "notifications.viewOwn")
  announcements(@CompanyId() companyId: string, @Query("priority") priority?: string) {
    return this.service.announcements(companyId, priority);
  }
}
