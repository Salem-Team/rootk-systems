import { Controller, UseGuards, Get, Patch, Body } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SettingsService } from "./settings.service";
import { ActorId, CompanyId } from "../common/tenant";
import { AppRole } from "../common/roles";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";

@Controller("settings")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

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
}
