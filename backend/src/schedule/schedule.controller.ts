import { Controller, UseGuards, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ScheduleService } from "./schedule.service";
import { ActorId, CompanyId } from "../common/tenant";
import { AppRole } from "../common/roles";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";

@Controller("schedule")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get()
  get(@CompanyId() companyId: string) {
    return this.service.get(companyId);
  }

  @Patch()
  @Roles(AppRole.admin)
  patch(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.patch(companyId, actorId, body);
  }

  @Get("holidays")
  holidays(
    @CompanyId() companyId: string,
    @Query("type") type?: string,
    @Query("from") from?: string
  ) {
    return this.service.listHolidays(companyId, type, from);
  }

  @Post("holidays")
  @Roles(AppRole.admin)
  addHoliday(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body()
    body: { name: string; date: string; type: string; description?: string }
  ) {
    return this.service.addHoliday(companyId, actorId, body);
  }

  @Delete("holidays/:id")
  @Roles(AppRole.admin)
  removeHoliday(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.removeHoliday(companyId, actorId, id);
  }
}
