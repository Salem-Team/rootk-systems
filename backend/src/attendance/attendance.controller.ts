import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AttendanceService } from "./attendance.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import {
  resolveActorEmployeeId,
  resolveScopedEmployeeId,
} from "../common/scoped-employee";
import { RequirePermission } from "../common/permissions.decorator";
import { RolesGuard } from "../common/roles.guard";

@Controller("attendance")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  @RequirePermission(
    "attendance.viewOwn",
    "attendance.viewTeam",
    "attendance.viewAll"
  )
  list(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Query("employeeId") employeeId?: string,
    @Query("date") date?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.list(companyId, {
      employeeId: resolveScopedEmployeeId(user, employeeId, {
        viewAll: "attendance.viewAll",
        viewTeam: "attendance.viewTeam",
      }),
      date,
      status,
      from,
      to,
    });
  }

  @Get("me/today")
  @RequirePermission("attendance.viewOwn")
  meToday(@CompanyId() companyId: string, @CurrentUser() user: JwtPayload) {
    return this.service.meToday(companyId, user.employeeId);
  }

  @Post("check-in")
  @RequirePermission("attendance.checkIn")
  checkIn(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      employeeId?: string;
      wfh?: boolean;
      note?: string;
      location?: { latitude: number; longitude: number; accuracy?: number };
    }
  ) {
    return this.service.checkIn(companyId, actorId, {
      ...body,
      employeeId: resolveActorEmployeeId(user, body.employeeId),
    });
  }

  @Post("check-out")
  @RequirePermission("attendance.checkOut")
  checkOut(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      employeeId?: string;
      location?: { latitude: number; longitude: number; accuracy?: number };
    }
  ) {
    return this.service.checkOut(companyId, actorId, {
      employeeId: resolveActorEmployeeId(user, body.employeeId),
      location: body.location,
    });
  }
}
