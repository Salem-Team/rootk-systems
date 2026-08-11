"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHasAnyPermission } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";
import type { PermissionId } from "@/constants/permissions";

export function PermissionGate({
  anyOf,
  children,
}: {
  anyOf: PermissionId[];
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const allowed = useHasAnyPermission(anyOf);

  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ShieldAlert className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="text-base font-semibold tracking-tight">
        {t("permissions.deniedTitle")}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {t("permissions.deniedDesc")}
      </p>
      <Button asChild className="mt-5" size="lg">
        <Link href="/dashboard">{t("roles.goDashboard")}</Link>
      </Button>
    </div>
  );
}
