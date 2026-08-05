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
import { LeaveService } from "./leave.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole, isEmployeeRole } from "../common/roles";
import { resolveScopedEmployeeId } from "../common/scoped-employee";

@Controller("leave")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Get()
  list(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string,
    @Query("type") type?: string
  ) {
    return this.service.list(companyId, {
      employeeId: resolveScopedEmployeeId(user, employeeId),
      status,
      type,
    });
  }

  @Get(":id")
  async byId(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    const row = await this.service.byId(companyId, id);
    if (
      row &&
      isEmployeeRole(user.role) &&
      row.employeeId !== user.employeeId
    ) {
      return null;
    }
    return row;
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      employeeId?: string;
      type: string;
      startDate: string;
      endDate: string;
      days: number;
      reason: string;
    }
  ) {
    return this.service.create(companyId, actorId, body, user.employeeId);
  }

  @Patch(":id/approve")
  @Roles(AppRole.admin)
  approve(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: { reviewerNote?: string }
  ) {
    return this.service.decide(
      companyId,
      actorId,
      id,
      "approved",
      body.reviewerNote
    );
  }

  @Patch(":id/reject")
  @Roles(AppRole.admin)
  reject(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: { reviewerNote?: string }
  ) {
    return this.service.decide(
      companyId,
      actorId,
      id,
      "rejected",
      body.reviewerNote
    );
  }

  @Delete(":id")
  remove(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.remove(companyId, actorId, id);
  }
}
