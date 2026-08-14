import {
  Controller,
  UseGuards,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "./users.service";
import { ActorId, CompanyId } from "../common/tenant";
import { RequirePermission } from "../common/permissions.decorator";

@Controller("users")
@UseGuards(AuthGuard("jwt"))
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@CompanyId() companyId: string, @Query("role") role?: string) {
    return this.service.list(companyId, role);
  }

  @Get("accounts")
  @RequirePermission("employees.view")
  listAccounts(@CompanyId() companyId: string) {
    return this.service.listAccounts(companyId);
  }

  @Put(":id/login-password")
  @RequirePermission("employees.resetPassword")
  setLoginPassword(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: { password?: string }
  ) {
    return this.service.setLoginPassword(
      companyId,
      actorId,
      id,
      typeof body.password === "string" ? body.password : ""
    );
  }

  @Get(":id")
  byId(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.service.byId(companyId, id);
  }

  @Get(":id/preferences")
  prefs(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.service.getPreferences(companyId, id);
  }

  @Put(":id/preferences")
  savePrefs(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.service.savePreferences(companyId, id, actorId, body);
  }

  @Post(":id/preferences/ensure")
  ensure(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.service.ensurePreferences(companyId, id);
  }
}
