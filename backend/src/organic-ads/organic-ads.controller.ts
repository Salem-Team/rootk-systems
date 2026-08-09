import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OrganicAdsService } from "./organic-ads.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole } from "../common/roles";
import { toDomainActor } from "../common/scoped-employee";

@Controller("organic-ads")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrganicAdsController {
  constructor(private readonly service: OrganicAdsService) {}

  private actor(user: JwtPayload, actorId: string) {
    return toDomainActor(user, actorId);
  }

  @Get("overview")
  overview(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query("range") range?: string,
    @Query("activitySort") activitySort?: string
  ) {
    return this.service.getOverview(
      companyId,
      this.actor(user, actorId),
      (range as "this_week" | "last_7_days" | "this_month" | "all") ??
        "this_week",
      (activitySort as "ads" | "last_activity") ?? "ads"
    );
  }

  @Get("performance")
  @Roles(AppRole.admin)
  performance(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.getSalesPerformance(
      companyId,
      this.actor(user, actorId)
    );
  }

  @Get("settings")
  settings(@CompanyId() companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Patch("settings")
  @Roles(AppRole.admin)
  updateSettings(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body()
    body: { weeklyTarget?: number; allowDuplicateOverride?: boolean }
  ) {
    return this.service.updateSettings(companyId, actorId, body);
  }

  @Get("history")
  history(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query("limit") limit?: string
  ) {
    return this.service.getHistory(
      companyId,
      this.actor(user, actorId),
      limit ? Number(limit) : 40
    );
  }

  @Get("linkable-tasks")
  linkableTasks(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query("employeeId") employeeId?: string
  ) {
    return this.service.listLinkableTasks(
      companyId,
      this.actor(user, actorId),
      employeeId
    );
  }

  @Get("employees/:employeeId/profile")
  profile(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("employeeId") employeeId: string
  ) {
    return this.service.getSalesProfile(
      companyId,
      this.actor(user, actorId),
      employeeId
    );
  }

  @Post("inspect")
  inspect(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { url: string }
  ) {
    return this.service.inspectUrl(
      companyId,
      this.actor(user, actorId),
      body.url
    );
  }

  @Get()
  list(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query("search") search?: string,
    @Query("ownerEmployeeId") ownerEmployeeId?: string,
    @Query("platform") platform?: string,
    @Query("project") project?: string,
    @Query("status") status?: string,
    @Query("validationStatus") validationStatus?: string,
    @Query("duplicateOnly") duplicateOnly?: string,
    @Query("range") range?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: string
  ) {
    return this.service.list(companyId, this.actor(user, actorId), {
      search,
      ownerEmployeeId,
      platform,
      project,
      status,
      validationStatus,
      duplicateOnly: duplicateOnly === "true" || duplicateOnly === "1",
      range,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      sortBy,
      sortDir,
    });
  }

  @Get(":id")
  byId(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.byId(companyId, this.actor(user, actorId), id);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
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
    return this.service.create(companyId, this.actor(user, actorId), body);
  }

  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body()
    body: {
      project?: string;
      campaign?: string;
      notes?: string;
      status?: string;
    }
  ) {
    return this.service.update(companyId, this.actor(user, actorId), id, body);
  }

  @Delete(":id")
  remove(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.remove(companyId, this.actor(user, actorId), id);
  }
}
