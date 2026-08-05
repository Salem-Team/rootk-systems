import { Controller, UseGuards, Get, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DashboardService } from "./dashboard.service";
import { CompanyId } from "../common/tenant";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("dashboard/stats")
  stats(@CompanyId() companyId: string) {
    return this.service.stats(companyId);
  }

  @Get("dashboard/summary")
  summary(@CompanyId() companyId: string) {
    return this.service.summary(companyId);
  }

  @Get("reports/weekly")
  weekly(@CompanyId() companyId: string) {
    return this.service.weekly(companyId);
  }

  @Get("reports/monthly")
  monthly(@CompanyId() companyId: string) {
    return this.service.monthly(companyId);
  }

  @Get("activities")
  activities(@CompanyId() companyId: string, @Query("limit") limit?: string) {
    return this.service.activities(companyId, limit ? Number(limit) : 20);
  }

  @Get("announcements")
  announcements(@CompanyId() companyId: string, @Query("priority") priority?: string) {
    return this.service.announcements(companyId, priority);
  }
}
