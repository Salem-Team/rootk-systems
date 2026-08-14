import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtPayload } from "./decorators/current-user";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { PermissionId } from "./permissions-catalog";
import { hasAnyPermissionId } from "./permissions-catalog";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionId[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }
    if (!hasAnyPermissionId(required, user.permissions, user.role)) {
      throw new ForbiddenException("You do not have permission for this action");
    }
    return true;
  }
}
