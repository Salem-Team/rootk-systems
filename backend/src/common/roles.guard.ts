import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import type { JwtPayload } from "./decorators/current-user";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Array<"admin" | "employee">>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const role = request.user?.role;
    if (!role || !roles.includes(role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
