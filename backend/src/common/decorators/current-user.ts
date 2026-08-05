import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type JwtPayload = {
  sub: string;
  role: "admin" | "employee";
  companyId: string;
  employeeId?: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return request.user;
  }
);
