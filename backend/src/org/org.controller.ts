import { Body, Controller, UseGuards, Get, Patch, Put, Delete, Post, Param } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OrgService } from "./org.service";
import { ActorId, CompanyId } from "../common/tenant";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";

@Controller("org")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrgController {
  constructor(private readonly service: OrgService) {}

  @Get("locations")
  locations(@CompanyId() companyId: string) {
    return this.service.listLocations(companyId);
  }

  @Post("locations/resolve-maps-url")
  @Roles("admin")
  resolveMapsUrl(@Body() body: { url?: string }) {
    return this.service.resolveMapsUrl(String(body.url ?? ""));
  }

  @Put("locations")
  @Roles("admin")
  upsertLocation(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertLocation(companyId, actorId, body);
  }

  @Delete("locations/:id")
  @Roles("admin")
  deleteLocation(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.deleteLocation(companyId, actorId, id);
  }

  @Get("departments")
  departments(@CompanyId() companyId: string) {
    return this.service.listDepartments(companyId);
  }

  @Put("departments")
  @Roles("admin")
  upsertDepartment(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertDepartment(companyId, actorId, body);
  }

  @Delete("departments/:id")
  @Roles("admin")
  deleteDepartment(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.deleteDepartment(companyId, actorId, id);
  }

  @Get("positions")
  positions(@CompanyId() companyId: string) {
    return this.service.listPositions(companyId);
  }

  @Put("positions")
  @Roles("admin")
  upsertPosition(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertPosition(companyId, actorId, body);
  }

  @Delete("positions/:id")
  @Roles("admin")
  deletePosition(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.deletePosition(companyId, actorId, id);
  }

  @Get("shifts")
  shifts(@CompanyId() companyId: string) {
    return this.service.listShifts(companyId);
  }

  @Put("shifts")
  @Roles("admin")
  upsertShift(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.upsertShift(companyId, actorId, body);
  }

  @Delete("shifts/:id")
  @Roles("admin")
  deleteShift(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string
  ) {
    return this.service.deleteShift(companyId, actorId, id);
  }

  @Get("approvals")
  approvals(@CompanyId() companyId: string) {
    return this.service.listApprovals(companyId);
  }

  @Patch("approvals/:id")
  @Roles("admin")
  patchApproval(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: { requiresApproval: boolean }
  ) {
    return this.service.patchApproval(
      companyId,
      actorId,
      id,
      body.requiresApproval
    );
  }
}
