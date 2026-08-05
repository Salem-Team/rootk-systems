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
import { WorkService } from "./work.service";
import { CompanyId, requireUser } from "../common/tenant";
import {
  CurrentUser,
  type JwtPayload,
} from "../common/decorators/current-user";
import { RolesGuard } from "../common/roles.guard";

function toActor(user: JwtPayload | undefined) {
  const u = requireUser(user);
  return {
    userId: u.sub,
    role: u.role,
    employeeId: u.employeeId ?? u.sub,
  };
}

@Controller("work")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class WorkController {
  constructor(private readonly service: WorkService) {}

  @Get("tasks")
  tasks(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("origin") origin?: string
  ) {
    return this.service.listTasks(companyId, toActor(user), {
      employeeId,
      status,
      priority,
      origin,
    });
  }

  @Get("tasks/:id")
  taskById(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.service.taskById(companyId, toActor(user), id);
  }

  @Post("tasks")
  createTask(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.createTask(companyId, toActor(user), body);
  }

  @Patch("tasks/:id")
  updateTask(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.updateTask(companyId, toActor(user), id, body);
  }

  @Patch("tasks/:id/status")
  taskStatus(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: { status: string }
  ) {
    return this.service.updateTaskStatus(
      companyId,
      toActor(user),
      id,
      body.status
    );
  }

  @Patch("tasks/:id/sub-items/:subId")
  toggleSub(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Param("subId") subId: string
  ) {
    return this.service.toggleSubItem(companyId, toActor(user), id, subId);
  }

  @Delete("tasks/:id")
  deleteTask(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.service.deleteTask(companyId, toActor(user), id);
  }

  @Get("meetings")
  meetings(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Query("employeeId") employeeId?: string,
    @Query("date") date?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.listMeetings(companyId, toActor(user), {
      employeeId,
      date,
      from,
      to,
    });
  }

  @Post("meetings")
  createMeeting(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.createMeeting(companyId, toActor(user), body);
  }

  @Patch("meetings/:id")
  updateMeeting(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.updateMeeting(companyId, toActor(user), id, body);
  }

  @Delete("meetings/:id")
  deleteMeeting(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.service.deleteMeeting(companyId, toActor(user), id);
  }
}
