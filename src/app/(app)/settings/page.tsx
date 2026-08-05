"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { SettingsForm } from "@/components/settings/settings-form";
import { CompanyAdminWorkspace } from "@/components/admin/company-admin-workspace";
import { RoleGate } from "@/components/shared/role-gate";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";

export default function SettingsPage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const isAdmin = role === "admin";

  return (
    <PageTransition>
      {isAdmin ? (
        <RoleGate allow={["admin"]}>
          <PageHeader
            eyebrow={t("admin.eyebrow")}
            title={t("admin.title")}
            description={t("admin.description")}
          />
          <CompanyAdminWorkspace />
        </RoleGate>
      ) : (
        <>
          <PageHeader
            eyebrow={t("settings.prefEyebrow")}
            title={t("settings.myTitle")}
            description={t("settings.myDesc")}
          />
          <SettingsForm />
        </>
      )}
    </PageTransition>
  );
}
