import { Controller, UseGuards, Get, Post, Patch, Body, Param, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { NotificationsService } from "./notifications.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { RequirePermission } from "../common/permissions.decorator";
import { RolesGuard } from "../common/roles.guard";

@Controller("notifications")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermission("notifications.viewOwn")
  list(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Query("category") category?: string,
    @Query("unreadOnly") unreadOnly?: string
  ) {
    return this.service.list(companyId, user.sub, user.role, { category, unreadOnly });
  }

  @Post()
  @RequirePermission("notifications.sendCompany")
  create(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.create(companyId, actorId, body);
  }

  @Patch(":id/read")
  @RequirePermission("notifications.viewOwn")
  markRead(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.markRead(companyId, user.sub, id);
  }

  @Post("read-all")
  @RequirePermission("notifications.viewOwn")
  markAll(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.markAll(companyId, user.sub, user.role);
  }
}
