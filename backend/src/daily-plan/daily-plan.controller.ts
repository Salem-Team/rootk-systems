import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DailyPlanService } from "./daily-plan.service";
import { DailyPlanReportService } from "./daily-plan-report.service";
import { ActorId, CompanyId, requireUser } from "../common/tenant";
import { AppRole } from "../common/roles";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  CurrentUser,
  type JwtPayload,
} from "../common/decorators/current-user";
import { toDomainActor } from "../common/scoped-employee";

@Controller("daily-plan")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DailyPlanController {
  constructor(
    private readonly service: DailyPlanService,
    private readonly report: DailyPlanReportService
  ) {}

  @Get("report")
  getReport(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Query("date") date?: string
  ) {
    const u = requireUser(user);
    return this.report.getReport(companyId, toDomainActor(u, u.sub), date ?? "");
  }

  @Get()
  get(@CompanyId() companyId: string, @ActorId() actorId: string) {
    return this.service.get(companyId, actorId);
  }

  @Put()
  @Roles(AppRole.admin)
  put(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: { title?: string; slots?: unknown }
  ) {
    return this.service.put(companyId, actorId, {
      title: body.title,
      slots: Array.isArray(body.slots) ? body.slots : [],
    });
  }
}
