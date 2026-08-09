"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { ProfileForm } from "@/components/profile/profile-form";
import { useTranslation } from "@/hooks/use-translation";

export default function ProfilePage() {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("profile.eyebrow")}
        title={t("profile.title")}
        description={t("profile.description")}
      />
      <ProfileForm />
    </PageTransition>
  );
}
