"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PermissionGate } from "@/components/shared/permission-gate";
import { UserPermissionsPanel } from "@/components/admin/user-permissions-panel";
import { useTranslation } from "@/hooks/use-translation";

export default function PermissionsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate anyOf={["settings.managePermissions"]}>
      <PageTransition>
        <PageHeader
          className="mb-4 sm:mb-7"
          eyebrow={t("permissions.nav")}
          title={t("permissions.title")}
          description={t("permissions.description")}
        />
        <UserPermissionsPanel />
      </PageTransition>
    </PermissionGate>
  );
}
