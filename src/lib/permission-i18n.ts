import type { PermissionId, PermissionModuleId } from "@/constants/permissions";
import type { TranslationPath } from "@/i18n";

export function permissionModuleLabelKey(
  module: PermissionModuleId
): TranslationPath {
  return `permissions.modules.${module}` as TranslationPath;
}

export function permissionLabelKey(id: PermissionId): TranslationPath {
  const [mod, name] = id.split(".");
  return `permissions.items.${mod}.${name}` as TranslationPath;
}

export function permissionDescKey(id: PermissionId): TranslationPath {
  const [mod, name] = id.split(".");
  return `permissions.items.${mod}.${name}Desc` as TranslationPath;
}
