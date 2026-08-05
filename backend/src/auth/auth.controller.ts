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
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { CurrentUser, type JwtPayload } from "../common/decorators/current-user";
import { AppRole } from "../common/roles";

class DemoLoginDto {
  @IsIn([AppRole.admin, AppRole.employee])
  role!: "admin" | "employee";
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("demo-login")
  @HttpCode(200)
  demoLogin(@Body() body: DemoLoginDto) {
    return this.auth.demoLogin(body.role);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

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
}
