import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { JwtPayload } from "./decorators/current-user";

export function requireUser(user?: JwtPayload): JwtPayload {
  if (!user?.sub || !user.companyId) {
    throw new UnauthorizedException("Missing auth context");
  }
  return user;
}

export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return requireUser(request.user).companyId;
  }
);

export const ActorId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return requireUser(request.user).sub;
  }
);
