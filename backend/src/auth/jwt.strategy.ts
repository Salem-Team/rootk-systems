import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "../common/decorators/current-user";
import { AppRole, isEmployeeRole } from "../common/roles";
import { loadEffectivePermissions } from "../common/permissions";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET", "rootk-dev-secret"),
    });
  }

  /**
   * Hydrate identity from DB on every request so assignee scoping always uses
   * the linked Employee.id (never a stale / missing JWT claim).
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException("Invalid token");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: {
        id: true,
        role: true,
        companyId: true,
        employeeId: true,
        email: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (isEmployeeRole(user.role) && !user.employeeId) {
      throw new UnauthorizedException(
        "Employee account is not linked to a workforce profile"
      );
    }

    const permissions = await loadEffectivePermissions(this.prisma, user);

    return {
      sub: user.id,
      role:
        (user.role as typeof AppRole.admin | typeof AppRole.employee) ??
        payload.role,
      companyId: user.companyId ?? payload.companyId,
      employeeId: user.employeeId ?? undefined,
      permissions,
    };
  }
}
