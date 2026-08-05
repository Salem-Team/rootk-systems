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

@Controller("attendance")
@UseGuards(AuthGuard("jwt"))
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
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
      employeeId: resolveScopedEmployeeId(user, employeeId),
      date,
      status,
      from,
      to,
    });
  }

  @Get("me/today")
  meToday(@CompanyId() companyId: string, @CurrentUser() user: JwtPayload) {
    return this.service.meToday(companyId, user.employeeId);
  }

  @Post("check-in")
  checkIn(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { employeeId?: string; wfh?: boolean; note?: string }
  ) {
    return this.service.checkIn(companyId, actorId, {
      ...body,
      employeeId: resolveActorEmployeeId(user, body.employeeId),
    });
  }

  @Post("check-out")
  checkOut(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { employeeId?: string }
  ) {
    return this.service.checkOut(companyId, actorId, {
      employeeId: resolveActorEmployeeId(user, body.employeeId),
    });
  }
}
