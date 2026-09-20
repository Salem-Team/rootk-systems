import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { WorkService } from "./work.service";
import { WorkTaskCommentsService } from "./work-task-comments.service";
import { CompanyId, requireUser } from "../common/tenant";
import {
  CurrentUser,
  type JwtPayload,
} from "../common/decorators/current-user";
import { RolesGuard } from "../common/roles.guard";
import { RequirePermission } from "../common/permissions.decorator";
import { toDomainActor } from "../common/scoped-employee";

function toActor(user: JwtPayload | undefined) {
  const u = requireUser(user);
  return toDomainActor(u, u.sub);
}

@Controller("work")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class WorkController {
  constructor(
    private readonly service: WorkService,
    private readonly comments: WorkTaskCommentsService
  ) {}

  @Get("tasks")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  tasks(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("origin") origin?: string,
    @Query("team") team?: string
  ) {
    return this.service.listTasks(companyId, toActor(user), {
      employeeId,
      status,
      priority,
      origin,
      team,
    });
  }

  @Get("tasks/:id")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  taskById(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.service.taskById(companyId, toActor(user), id);
  }

  @Post("tasks")
  @RequirePermission("tasks.create", "tasks.assign")
  createTask(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.createTask(companyId, toActor(user), body);
  }

  @Patch("tasks/:id")
  @RequirePermission("tasks.editOwn", "tasks.editTeam", "tasks.editOthers")
  updateTask(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.updateTask(companyId, toActor(user), id, body);
  }

  @Patch("tasks/:id/status")
  @RequirePermission("tasks.editOwn", "tasks.editTeam", "tasks.editOthers")
  taskStatus(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body()
    body: {
      status: string;
      evidence?: { links?: string[]; notes?: string };
    }
  ) {
    return this.service.updateTaskStatus(
      companyId,
      toActor(user),
      id,
      body.status,
      body.evidence
    );
  }

  @Patch("tasks/:id/sub-items/:subId")
  @RequirePermission("tasks.editOwn", "tasks.editTeam", "tasks.editOthers")
  toggleSub(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Param("subId") subId: string
  ) {
    return this.service.toggleSubItem(companyId, toActor(user), id, subId);
  }

  @Delete("tasks/:id")
  @RequirePermission("tasks.deleteOwn", "tasks.deleteTeam", "tasks.deleteOthers")
  deleteTask(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.service.deleteTask(companyId, toActor(user), id);
  }

  @Get("tasks/:id/comments")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  listComments(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.comments.listComments(companyId, toActor(user), id);
  }

  @Post("tasks/:id/comments")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  createComment(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.comments.createComment(companyId, toActor(user), id, body);
  }

  @Delete("tasks/:id/comments/:commentId")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  deleteComment(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Param("commentId") commentId: string
  ) {
    return this.comments.deleteComment(
      companyId,
      toActor(user),
      id,
      commentId
    );
  }

  @Get("tasks/:id/voice/:fileId")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  async streamVoice(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Param("fileId") fileId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const { file, mime } = await this.comments.streamVoice(
      companyId,
      toActor(user),
      id,
      fileId
    );
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return file;
  }

  @Get("tasks/:id/media/:fileId")
  @RequirePermission("tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll")
  async streamTaskMedia(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Param("fileId") fileId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const { file, mime } = await this.service.streamTaskMedia(
      companyId,
      toActor(user),
      id,
      fileId
    );
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return file;
  }

  @Get("meetings")
  @RequirePermission("tasks.manageMeetings", "tasks.viewOwn", "tasks.viewAll")
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
  @RequirePermission("tasks.manageMeetings")
  createMeeting(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.createMeeting(companyId, toActor(user), body);
  }

  @Patch("meetings/:id")
  @RequirePermission("tasks.manageMeetings")
  updateMeeting(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.updateMeeting(companyId, toActor(user), id, body);
  }

  @Delete("meetings/:id")
  @RequirePermission("tasks.manageMeetings")
  deleteMeeting(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string
  ) {
    return this.service.deleteMeeting(companyId, toActor(user), id);
  }
}
