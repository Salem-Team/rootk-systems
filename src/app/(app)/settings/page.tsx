"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { SettingsForm } from "@/components/settings/settings-form";
import { CompanyAdminWorkspace } from "@/components/admin/company-admin-workspace";
import { useCanManageCompanySettings } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";

export default function SettingsPage() {
  const { t } = useTranslation();
  const showWorkspace = useCanManageCompanySettings();

  return (
    <PageTransition>
      {showWorkspace ? (
        <>
          <PageHeader
            className="mb-4 sm:mb-7"
            eyebrow={t("admin.eyebrow")}
            title={t("admin.title")}
            description={t("admin.description")}
          />
          <CompanyAdminWorkspace />
        </>
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
