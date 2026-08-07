"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { WarningCenter } from "@/components/targets/warning-center";
import { getWorkforceEmployees } from "@/services/employees.service";
import { getTargets } from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { PerformanceTarget } from "@/types/targets";

/** Focused entry point into the targets warning center (linked from notifications). */
export default function TargetWarningsFocusPage() {
  const { t } = useTranslation();
  const [targets, setTargets] = useState<PerformanceTarget[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [targetsRes, employeesRes] = await Promise.all([
        getTargets(),
        getWorkforceEmployees(),
      ]);
      if (!mounted) return;
      if (targetsRes.success) setTargets(targetsRes.data);
      if (employeesRes.success) setEmployees(employeesRes.data);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  if (!ready) return <PageSkeleton />;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("targets.page.eyebrow")}
        title={t("targets.warnings.title")}
        description={t("targets.warnings.description")}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/targets">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("targets.nav.targets")}
            </Link>
          </Button>
        }
      />
      <WarningCenter targets={targets} employees={employeeMap} />
    </PageTransition>
  );
}
