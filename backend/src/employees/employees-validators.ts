import { BadRequestException } from "@nestjs/common";

export function requireCreateFields(body: {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  joinDate?: string;
  password?: string;
}) {
  const missing: string[] = [];
  if (!body.name?.trim()) missing.push("name");
  if (!body.email?.trim()) missing.push("email");
  if (!body.department?.trim()) missing.push("department");
  if (!body.position?.trim()) missing.push("position");
  if (!body.joinDate?.trim()) missing.push("joinDate");
  if (!body.password?.trim()) missing.push("password");
  if (missing.length) {
    throw new BadRequestException(
      `Missing required fields: ${missing.join(", ")}`
    );
  }
  if ((body.password?.trim().length ?? 0) < 6) {
    throw new BadRequestException("Password must be at least 6 characters");
  }
}

export function assertOptionalPassword(password?: string) {
  if (password === undefined || password === null || password === "") return;
  if (password.trim().length < 6) {
    throw new BadRequestException("Password must be at least 6 characters");
  }
}
