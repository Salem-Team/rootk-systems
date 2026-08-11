import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from "class-validator";
import { PermissionsService } from "./permissions.service";
import { ActorId, CompanyId } from "../common/tenant";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { RequirePermission } from "../common/permissions.decorator";
import { RolesGuard } from "../common/roles.guard";

class PermissionOverrideDto {
  @IsString()
  permissionId!: string;

  @IsBoolean()
  granted!: boolean;
}

class SaveUserPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  overrides!: PermissionOverrideDto[];
}

@Controller("permissions")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get("me")
  me(@CurrentUser() user: JwtPayload) {
    return user.permissions ?? [];
  }

  @Get("catalog")
  @RequirePermission("settings.managePermissions")
  catalog() {
    return this.service.catalog();
  }

  @Get("users")
  @RequirePermission("settings.managePermissions")
  listUsers(@CompanyId() companyId: string) {
    return this.service.listUsers(companyId);
  }

  @Get("users/:userId")
  @RequirePermission("settings.managePermissions")
  getUser(@CompanyId() companyId: string, @Param("userId") userId: string) {
    return this.service.getUser(companyId, userId);
  }

  @Put("users/:userId")
  @RequirePermission("settings.managePermissions")
  saveUser(
    @CompanyId() companyId: string,
    @ActorId() actorId: string,
    @Param("userId") userId: string,
    @Body() body: SaveUserPermissionsDto
  ) {
    return this.service.saveUser(companyId, userId, actorId, body);
  }
}
