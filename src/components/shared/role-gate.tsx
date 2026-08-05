"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { UserRole } from "@/types";

interface RoleGateProps {
  allow: UserRole[];
  children: React.ReactNode;
}

export function RoleGate({ allow, children }: RoleGateProps) {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);

  if (allow.includes(role)) return <>{children}</>;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold tracking-tight">{t("roles.adminOnly")}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {t("roles.adminOnlyDesc")}
      </p>
      <Button asChild className="mt-5" size="lg">
        <Link href="/dashboard">{t("roles.goDashboard")}</Link>
      </Button>
    </div>
  );
}
