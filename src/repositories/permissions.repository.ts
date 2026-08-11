import { getStorageAdapter } from "@/storage";
import { StorageKeys } from "@/storage/keys";
import type { PermissionId } from "@/constants/permissions";
import { isPermissionId } from "@/constants/permissions";

export type StoredPermissionOverride = {
  userId: string;
  permissionId: PermissionId;
  granted: boolean;
};

export class PermissionsRepository {
  private adapter = getStorageAdapter();

  private async readAll(): Promise<StoredPermissionOverride[]> {
    const rows =
      (await this.adapter.getItem<StoredPermissionOverride[]>(
        StorageKeys.permissionOverrides
      )) ?? [];
    return rows.filter((row) => isPermissionId(row.permissionId));
  }

  private async writeAll(rows: StoredPermissionOverride[]): Promise<void> {
    await this.adapter.setItem(StorageKeys.permissionOverrides, rows);
  }

  async findByUserId(userId: string): Promise<StoredPermissionOverride[]> {
    const rows = await this.readAll();
    return rows.filter((row) => row.userId === userId);
  }

  async replaceForUser(
    userId: string,
    overrides: Array<{ permissionId: PermissionId; granted: boolean }>
  ): Promise<StoredPermissionOverride[]> {
    const others = (await this.readAll()).filter((row) => row.userId !== userId);
    const next: StoredPermissionOverride[] = overrides.map((item) => ({
      userId,
      permissionId: item.permissionId,
      granted: item.granted,
    }));
    await this.writeAll([...others, ...next]);
    return next;
  }
}

export const permissionsRepository = new PermissionsRepository();
