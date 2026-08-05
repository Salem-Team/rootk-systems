import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PreferencesService } from "./preferences.service";
import { ActorId, CompanyId } from "../common/tenant";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole } from "../common/roles";

@Controller("preferences")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(AppRole.admin)
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Get("employees")
  employeeRows(@CompanyId() companyId: string) {
    return this.service.employeeRows(companyId);
  }

  @Post("employees/reset-notifications")
  resetAll(
    @CompanyId() companyId: string,
    @ActorId() actorId: string
  ) {
    return this.service.resetAllEmployeeNotifications(companyId, actorId);
  }

  @Post("employees/:userId/reset-notifications")
  resetOne(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("userId") userId: string
  ) {
    return this.service.resetEmployeeNotifications(
      companyId,
      actorId,
      userId
    );
  }
}
