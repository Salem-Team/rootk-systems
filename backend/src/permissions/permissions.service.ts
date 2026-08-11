import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { mapUser } from "../common/mappers";
import { isProtectedAdminAccount } from "../common/protected-accounts";
import {
  PERMISSION_CATALOG,
  isPermissionId,
  loadEffectivePermissions,
  overridesFromEffective,
  permissionsForRole,
  resolveEffectivePermissions,
  type PermissionId,
} from "../common/permissions";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return PERMISSION_CATALOG.map((item) => ({
      id: item.id,
      module: item.module,
      employeeDefault: item.employeeDefault,
    }));
  }

  async listUsers(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      include: {
        permissionOverrides: {
          select: { permissionId: true, granted: true },
        },
      },
    });
    return users.map((row) => {
      const protectedAdmin = isProtectedAdminAccount({
        userId: row.id,
        email: row.email,
      });
      const effective = resolveEffectivePermissions(
        row.role,
        row.permissionOverrides,
        { protectedAdmin }
      );
      return {
        user: mapUser(row),
        role: row.role,
        isProtected: protectedAdmin,
        overrideCount: row.permissionOverrides.length,
        grantedCount: effective.length,
      };
    });
  }

  async getUser(companyId: string, userId: string) {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, companyId, deletedAt: null },
      include: {
        permissionOverrides: {
          select: { permissionId: true, granted: true },
        },
      },
    });
    if (!row) throw new NotFoundException("User not found");
    const protectedAdmin = isProtectedAdminAccount({
      userId: row.id,
      email: row.email,
    });
    const defaults = permissionsForRole(row.role);
    const effective = resolveEffectivePermissions(
      row.role,
      row.permissionOverrides,
      { protectedAdmin }
    );
    return {
      user: mapUser(row),
      role: row.role,
      isProtected: protectedAdmin,
      defaults,
      overrides: row.permissionOverrides.filter((item) =>
        isPermissionId(item.permissionId)
      ),
      effective,
    };
  }

  async saveUser(
    companyId: string,
    userId: string,
    actorId: string,
    input: { overrides?: Array<{ permissionId: string; granted: boolean }> }
  ) {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("User not found");
    if (
      isProtectedAdminAccount({
        userId: row.id,
        email: row.email,
      })
    ) {
      throw new ForbiddenException(
        "The system admin account always keeps full access"
      );
    }

    const raw = Array.isArray(input.overrides) ? input.overrides : [];
    const seen = new Map<PermissionId, boolean>();
    for (const item of raw) {
      if (!isPermissionId(item.permissionId)) continue;
      seen.set(item.permissionId, Boolean(item.granted));
    }
    const compact = overridesFromEffective(
      row.role,
      resolveEffectivePermissions(
        row.role,
        [...seen.entries()].map(([permissionId, granted]) => ({
          permissionId,
          granted,
        }))
      )
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermissionOverride.deleteMany({
        where: { companyId, userId },
      });
      if (compact.length === 0) return;
      await tx.userPermissionOverride.createMany({
        data: compact.map((item) => ({
          companyId,
          userId,
          permissionId: item.permissionId,
          granted: item.granted,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    });

    return this.getUser(companyId, userId);
  }

  async me(user: {
    id: string;
    companyId: string;
    role: string;
    email?: string | null;
  }) {
    return loadEffectivePermissions(this.prisma, user);
  }
}
