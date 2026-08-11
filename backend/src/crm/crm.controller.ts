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
import { CrmService } from "./crm.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole } from "../common/roles";
import { toDomainActor } from "../common/scoped-employee";
import { RequirePermission } from "../common/permissions.decorator";

@Controller("crm")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class CrmController {
  constructor(private readonly service: CrmService) {}

  // ── Stages ──────────────────────────────────────────────────────────────

  @Get("stages")
  listStages(@CompanyId() companyId: string) {
    return this.service.listStages(companyId);
  }

  @Put("stages")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageStages")
  upsertStage(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertStage(companyId, toDomainActor(user, actorId), body);
  }

  @Post("stages/reorder")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageStages")
  reorderStages(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.reorderStages(companyId, toDomainActor(user, actorId), body);
  }

  @Delete("stages/:id")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageStages")
  deleteStage(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query("moveToStageId") moveToStageId?: string,
    @Body() body?: Record<string, unknown>
  ) {
    const moveTo =
      moveToStageId ||
      (typeof body?.moveToStageId === "string" ? body.moveToStageId : undefined);
    return this.service.deleteStage(companyId, toDomainActor(user, actorId), id, moveTo);
  }

  // ── Sub-stages ──────────────────────────────────────────────────────────

  @Put("sub-stages")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageStages")
  upsertSubStage(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertSubStage(
      companyId,
      toDomainActor(user, actorId),
      body
    );
  }

  @Post("sub-stages/reorder")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageStages")
  reorderSubStages(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.reorderSubStages(
      companyId,
      toDomainActor(user, actorId),
      body
    );
  }

  @Delete("sub-stages/:id")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageStages")
  deleteSubStage(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteSubStage(
      companyId,
      toDomainActor(user, actorId),
      id
    );
  }

  // ── Feedback types ──────────────────────────────────────────────────────

  @Get("feedback-types")
  listFeedbackTypes(@CompanyId() companyId: string) {
    return this.service.listFeedbackTypes(companyId);
  }

  @Put("feedback-types")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageFeedbackTypes")
  upsertFeedbackType(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertFeedbackType(companyId, toDomainActor(user, actorId), body);
  }

  @Delete("feedback-types/:id")
  @Roles(AppRole.admin)
  @RequirePermission("crm.manageFeedbackTypes")
  deleteFeedbackType(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteFeedbackType(companyId, toDomainActor(user, actorId), id);
  }

  // ── Leads ───────────────────────────────────────────────────────────────

  @Get("leads")
  listLeads(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.listLeads(companyId, toDomainActor(user, actorId), query);
  }

  @Post("leads")
  createLead(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.createLead(companyId, toDomainActor(user, actorId), body);
  }

  @Post("leads/bulk")
  bulkLeads(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.bulkLeads(companyId, toDomainActor(user, actorId), body);
  }

  @Post("leads/import")
  importLeads(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.importLeads(
      companyId,
      toDomainActor(user, actorId),
      body
    );
  }

  @Get("leads/export")
  exportLeads(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.exportLeads(
      companyId,
      toDomainActor(user, actorId),
      query
    );
  }

  @Get("leads/:id")
  getLead(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.getLead(companyId, toDomainActor(user, actorId), id);
  }

  @Patch("leads/:id")
  updateLead(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.updateLead(companyId, toDomainActor(user, actorId), id, body);
  }

  @Delete("leads/:id")
  deleteLead(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.deleteLead(companyId, toDomainActor(user, actorId), id);
  }

  @Post("leads/:id/activities")
  addActivity(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.addActivity(companyId, toDomainActor(user, actorId), id, body);
  }

  @Get("leads/:id/timeline")
  timeline(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.getTimeline(companyId, toDomainActor(user, actorId), id);
  }

  @Post("leads/:id/feedback")
  addFeedback(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.addFeedback(companyId, toDomainActor(user, actorId), id, body);
  }

  // ── Analytics ───────────────────────────────────────────────────────────

  @Get("dashboard")
  dashboard(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.dashboard(companyId, toDomainActor(user, actorId), query);
  }

  @Get("performance")
  performance(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.performance(companyId, toDomainActor(user, actorId), query);
  }

  @Get("performance/:employeeId")
  performanceProfile(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("employeeId") employeeId: string
  ) {
    return this.service.performanceProfile(
      companyId,
      toDomainActor(user, actorId),
      employeeId
    );
  }

  @Get("activities")
  recentActivities(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.service.listRecentActivities(
      companyId,
      toDomainActor(user, actorId),
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20
    );
  }

  @Get("feedback")
  listFeedback(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.listFeedback(companyId, toDomainActor(user, actorId), query);
  }

  @Get("reports")
  reports(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string | undefined>
  ) {
    return this.service.reports(companyId, toDomainActor(user, actorId), query);
  }
}
