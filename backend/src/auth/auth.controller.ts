import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { Public } from "../common/public.decorator";

class LoginDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Post("change-password")
  @HttpCode(200)
  @UseGuards(AuthGuard("jwt"))
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() body: ChangePasswordDto
  ) {
    if (!user) throw new UnauthorizedException();
    return this.auth.changePassword(
      user.sub,
      body.currentPassword,
      body.newPassword
    );
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(AuthGuard("jwt"))
  logout(@CurrentUser() user: JwtPayload, @Body() body: LogoutDto) {
    if (!user) throw new UnauthorizedException();
    return this.auth.logout(user.sub, body.refreshToken);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  me(@CurrentUser() user: JwtPayload) {
    if (!user) throw new UnauthorizedException();
    return this.auth.me(user);
  }

  /** Same verb style as change-password — avoids stale PATCH /me watch misses. */
  @Post("profile")
  @HttpCode(200)
  @UseGuards(AuthGuard("jwt"))
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateProfileDto
  ) {
    if (!user) throw new UnauthorizedException();
    return this.auth.updateProfile(user.sub, user.companyId, body);
  }
}
