import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AppRole } from "../common/roles";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { toDomainActor } from "../common/scoped-employee";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { ActorId, CompanyId } from "../common/tenant";
import { CrmService } from "./crm.service";
import { RequirePermission } from "../common/permissions.decorator";

/** Catalog CRUD routes for CRM (business types). */
@Controller("crm")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class CrmCatalogController {
  constructor(private readonly service: CrmService) {}

  @Get("business-types")
  listBusinessTypes(@CompanyId() companyId: string) {
    return this.service.listBusinessTypes(companyId);
  }

  @Put("business-types")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageBusinessTypes")
  upsertBusinessType(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertBusinessType(
      companyId,
      toDomainActor(user, actorId),
      body
    );
  }

  @Delete("business-types/:id")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageBusinessTypes")
  deleteBusinessType(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteBusinessType(
      companyId,
      toDomainActor(user, actorId),
      id
    );
  }
}
