import { Controller, UseGuards, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { EmployeesService } from "./employees.service";
import { ActorId, CompanyId } from "../common/tenant";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AppRole } from "../common/roles";

@Controller("employees")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  list(
    @CompanyId() companyId: string,
    @Query("query") query?: string,
    @Query("department") department?: string,
    @Query("status") status?: string,
    @Query("location") location?: string
  ) {
    return this.service.list(companyId, {
      query,
      department,
      status,
      location,
    });
  }

  @Get(":id/profile-extras")
  profileExtras(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.service.profileExtras(companyId, id);
  }

  @Get(":id")
  byId(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.service.byId(companyId, id);
  }

  @Post()
  @Roles(AppRole.admin)
  create(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.create(companyId, actorId, body as never);
  }

  @Patch(":id/status")
  @Roles(AppRole.admin)
  status(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: { status: string }
  ) {
    return this.service.updateStatus(companyId, actorId, id, body.status);
  }

  @Patch(":id")
  @Roles(AppRole.admin)
  update(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.update(companyId, actorId, id, body);
  }

  @Delete(":id")
  @Roles(AppRole.admin)
  remove(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.remove(companyId, actorId, id);
  }
}
