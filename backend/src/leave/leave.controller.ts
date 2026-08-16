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
import { RolesGuard } from "../common/roles.guard";
import { RequirePermission } from "../common/permissions.decorator";

@Controller("leave")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Get()
  @RequirePermission("leave.viewOwn", "leave.viewTeam", "leave.viewAll")
  list(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string,
    @Query("type") type?: string
  ) {
    return this.service.list(
      companyId,
      {
        employeeId,
        status,
        type,
      },
      user
    );
  }

  @Get(":id")
  @RequirePermission("leave.viewOwn", "leave.viewTeam", "leave.viewAll")
  async byId(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string
  ) {
    return this.service.byId(companyId, id, user);
  }

  @Post()
  @RequirePermission("leave.request")
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
  @RequirePermission("leave.approve", "leave.approveTeam")
  approve(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: { reviewerNote?: string }
  ) {
    return this.service.decide(
      companyId,
      actorId,
      id,
      "approved",
      body.reviewerNote,
      user
    );
  }

  @Patch(":id/reject")
  @RequirePermission("leave.reject", "leave.rejectTeam")
  reject(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: { reviewerNote?: string }
  ) {
    return this.service.decide(
      companyId,
      actorId,
      id,
      "rejected",
      body.reviewerNote,
      user
    );
  }

  @Delete(":id")
  @RequirePermission("leave.delete")
  remove(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.remove(companyId, actorId, id);
  }
}
