import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_COMPANY_ID } from "../common/company";
import { mapUser } from "../common/mappers";
import type { JwtPayload } from "../common/decorators/current-user";
import { hashPassword, verifyPassword } from "./password.util";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  private companyId() {
    return this.config.get<string>("DEFAULT_COMPANY_ID", DEFAULT_COMPANY_ID);
  }

  private async issueTokens(payload: JwtPayload) {
    const accessToken = this.jwt.sign({ ...payload });
    const refreshToken = this.jwt.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get<string>("JWT_SECRET", "rootk-dev-secret"),
        expiresIn: "7d",
      }
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const companyId = this.companyId();
    const row = await this.prisma.user.findFirst({
      where: {
        companyId,
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
        isActive: true,
      },
    });
    if (!row || !verifyPassword(password, row.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const user = mapUser(row);
    const tokens = await this.issueTokens({
      sub: row.id,
      role: row.role,
      companyId: row.companyId,
      employeeId: row.employeeId ?? undefined,
    });
    return { user, role: row.role, tokens };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    if (newPassword.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        "New password must be different from the current password"
      );
    }

    const row = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(newPassword),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    // Force re-login on other devices.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return true;
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>("JWT_SECRET", "rootk-dev-secret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException("Refresh token revoked or expired");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Frontend expects AuthTokens at data root (not nested under `tokens`).
    return this.issueTokens({
      sub: payload.sub,
      role: payload.role,
      companyId: payload.companyId,
      employeeId: payload.employeeId,
    });
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return true;
  }

  async me(payload: JwtPayload) {
    const row = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        companyId: payload.companyId,
        deletedAt: null,
      },
    });
    if (!row) throw new UnauthorizedException("User not found");
    return mapUser(row);
  }

  /** POST /auth/profile — update signed-in name (+ linked employee contact). */
  async updateProfile(
    userId: string,
    companyId: string,
    input: { firstName?: string; lastName?: string; phone?: string }
  ) {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, companyId, deletedAt: null, isActive: true },
    });
    if (!row) throw new UnauthorizedException("User not found");

    const firstName =
      typeof input.firstName === "string" ? input.firstName.trim() : undefined;
    const lastName =
      typeof input.lastName === "string" ? input.lastName.trim() : undefined;
    const phone =
      typeof input.phone === "string" ? input.phone.trim() : undefined;

    if (firstName !== undefined && !firstName) {
      throw new BadRequestException("First name is required");
    }

    const nextFirst = firstName ?? row.firstName?.trim() ?? "";
    const nextLast =
      lastName !== undefined ? lastName : (row.lastName?.trim() ?? "");
    const displayName = [nextFirst, nextLast].filter(Boolean).join(" ").trim();
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(displayName ? { displayName } : {}),
        ...(initials ? { initials } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    if (row.employeeId && (displayName || phone !== undefined)) {
      await this.prisma.employee.updateMany({
        where: { id: row.employeeId, companyId, deletedAt: null },
        data: {
          ...(displayName ? { name: displayName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          updatedBy: userId,
          version: { increment: 1 },
        },
      });
    }

    let phoneOut = phone ?? "";
    if (row.employeeId) {
      const emp = await this.prisma.employee.findFirst({
        where: { id: row.employeeId, companyId, deletedAt: null },
        select: { phone: true },
      });
      phoneOut = emp?.phone ?? phoneOut;
    }

    return { user: mapUser(updated), phone: phoneOut };
  }
}
