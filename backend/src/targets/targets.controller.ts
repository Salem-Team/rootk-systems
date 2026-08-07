import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TargetsService } from "./targets.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole } from "../common/roles";

@Controller("targets")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class TargetsController {
  constructor(private readonly service: TargetsService) {}

  private actor(user: JwtPayload, actorId: string) {
    return {
      userId: actorId,
      role: user.role as "admin" | "employee",
      employeeId: user.employeeId ?? "",
    };
  }

  @Get("categories")
  listCategories(@CompanyId() companyId: string) {
    return this.service.listCategories(companyId);
  }

  @Put("categories")
  @Roles(AppRole.admin)
  upsertCategory(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertCategory(
      companyId,
      this.actor(user, actorId),
      body
    );
  }

  @Delete("categories/:id")
  @Roles(AppRole.admin)
  deleteCategory(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteCategory(
      companyId,
      this.actor(user, actorId),
      id
    );
  }

  @Get("types")
  listTypes(
    @CompanyId() companyId: string,
    @Query("categoryId") categoryId?: string
  ) {
    return this.service.listTypes(companyId, categoryId);
  }

  @Put("types")
  @Roles(AppRole.admin)
  upsertType(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertType(companyId, this.actor(user, actorId), body);
  }

  @Delete("types/:id")
  @Roles(AppRole.admin)
  deleteType(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteType(companyId, this.actor(user, actorId), id);
  }

  @Get("templates")
  listTemplates(@CompanyId() companyId: string) {
    return this.service.listTemplates(companyId);
  }

  @Put("templates")
  @Roles(AppRole.admin)
  upsertTemplate(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertTemplate(
      companyId,
      this.actor(user, actorId),
      body
    );
  }

  @Delete("templates/:id")
  @Roles(AppRole.admin)
  deleteTemplate(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteTemplate(
      companyId,
      this.actor(user, actorId),
      id
    );
  }

  @Get("dashboard")
  dashboard(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.dashboard(companyId, this.actor(user, actorId));
  }

  @Get("delayed")
  delayed(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.delayedCenter(companyId, this.actor(user, actorId));
  }

  @Get("warnings")
  listWarnings(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query("targetId") targetId?: string,
    @Query("employeeId") employeeId?: string
  ) {
    return this.service.listWarnings(companyId, this.actor(user, actorId), {
      targetId,
      employeeId,
    });
  }

  @Post("warnings")
  @Roles(AppRole.admin)
  sendWarning(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.sendWarning(companyId, this.actor(user, actorId), body);
  }

  @Patch("warnings/:id/acknowledge")
  acknowledgeWarning(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.acknowledgeWarning(
      companyId,
      this.actor(user, actorId),
      id
    );
  }

  @Get("employees/:employeeId/performance")
  employeePerformance(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("employeeId") employeeId: string
  ) {
    return this.service.employeePerformance(
      companyId,
      this.actor(user, actorId),
      employeeId
    );
  }

  @Get()
  list(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.listTargets(
      companyId,
      this.actor(user, actorId),
      query
    );
  }

  @Get(":id")
  byId(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.getTarget(companyId, this.actor(user, actorId), id);
  }

  @Post()
  @Roles(AppRole.admin)
  assign(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.assignTarget(
      companyId,
      this.actor(user, actorId),
      body
    );
  }

  @Patch(":id")
  @Roles(AppRole.admin)
  update(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.updateTarget(
      companyId,
      this.actor(user, actorId),
      id,
      body
    );
  }

  @Post(":id/recalculate")
  @Roles(AppRole.admin)
  recalculate(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.recalculateTarget(companyId, id, actorId);
  }

  @Delete(":id")
  @Roles(AppRole.admin)
  remove(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteTarget(
      companyId,
      this.actor(user, actorId),
      id
    );
  }
}
