"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { DelayedCenter } from "@/components/targets/delayed-center";
import { TargetAssignSheet } from "@/components/targets/target-assign-sheet";
import { getWorkforceEmployees } from "@/services/employees.service";
import { getTargetCategories, getTargetTypes } from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { canTarget } from "@/lib/target-policies";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory, TargetType } from "@/types/targets";

/** Focused entry point into delayed/critical/at-risk targets. */
export default function TargetDelayedFocusPage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) =>
    s.authenticated ? s.permissions : undefined
  );
  const canEdit = canTarget(role, "edit", permissions);

  const [categories, setCategories] = useState<TargetCategory[]>([]);
  const [types, setTypes] = useState<TargetType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ready, setReady] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<PerformanceTarget | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [catRes, typeRes, empRes] = await Promise.all([
        getTargetCategories(),
        getTargetTypes(),
        getWorkforceEmployees(),
      ]);
      if (!mounted) return;
      if (catRes.success) setCategories(catRes.data);
      if (typeRes.success) setTypes(typeRes.data);
      if (empRes.success) setEmployees(empRes.data);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  function openEdit(target: PerformanceTarget) {
    setEditingTarget(target);
    setAssignOpen(true);
  }

  if (!ready) return <PageSkeleton />;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("targets.page.eyebrow")}
        title={t("targets.delayed.title")}
        description={t("targets.delayed.description")}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/targets">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("targets.nav.targets")}
            </Link>
          </Button>
        }
      />
      <DelayedCenter
        categories={categoryMap}
        employees={employeeMap}
        onEdit={canEdit ? openEdit : undefined}
      />

      <TargetAssignSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        categories={categories}
        types={types}
        employees={employees}
        editingTarget={editingTarget}
        onSaved={() => setAssignOpen(false)}
      />
    </PageTransition>
  );
}
