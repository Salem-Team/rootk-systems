"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { CatalogManager } from "@/components/targets/catalog-manager";
import { DelayedCenter } from "@/components/targets/delayed-center";
import { EmployeePerformancePanel } from "@/components/targets/employee-performance-panel";
import { PerformanceReportPanel } from "@/components/targets/performance-report-panel";
import { TargetAssignSheet } from "@/components/targets/target-assign-sheet";
import { TargetDashboardPanel } from "@/components/targets/target-dashboard-panel";
import { TargetFiltersBar } from "@/components/targets/target-filters";
import {
  TargetHubSidebar,
  type TargetHubTab,
} from "@/components/targets/target-hub-sidebar";
import { TargetKpiCards } from "@/components/targets/target-kpi-cards";
import { TargetList } from "@/components/targets/target-list";
import { TargetViewSheet } from "@/components/targets/target-view-sheet";
import { WarningCenter } from "@/components/targets/warning-center";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  getTargetCategories,
  getTargetDashboard,
  getTargetTypes,
  getTargets,
  removeTarget,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT } from "@/lib/events";
import { canTarget } from "@/lib/target-policies";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetDashboardStats,
  TargetFilters,
  TargetType,
} from "@/types/targets";

export default function TargetsPage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const isAdmin = role === "admin";
  const canAssign = canTarget(role, "assign");
  const canManageCatalog = canTarget(role, "manage_categories");
  const canViewReports = canTarget(role, "view_reports");

  const [tab, setTab] = useState<TargetHubTab>("dashboard");
  const [categories, setCategories] = useState<TargetCategory[]>([]);
  const [types, setTypes] = useState<TargetType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targets, setTargets] = useState<PerformanceTarget[]>([]);
  /** Targets scoped by category only — drives assignee filter options/counts. */
  const [assigneePool, setAssigneePool] = useState<PerformanceTarget[]>([]);
  const [stats, setStats] = useState<TargetDashboardStats | null>(null);
  const [filters, setFilters] = useState<TargetFilters>({});
  const [ready, setReady] = useState(false);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<PerformanceTarget | null>(
    null
  );
  const [viewingTarget, setViewingTarget] = useState<PerformanceTarget | null>(
    null
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const selectedCategory = filters.categoryId
    ? categoryMap.get(filters.categoryId)
    : undefined;

  const loadStatic = useCallback(async () => {
    const [catRes, typeRes, empRes] = await Promise.all([
      getTargetCategories(),
      getTargetTypes(),
      getWorkforceEmployees(),
    ]);
    if (catRes.success) setCategories(catRes.data);
    if (typeRes.success) setTypes(typeRes.data);
    if (empRes.success) setEmployees(empRes.data);
  }, []);

  const loadTargets = useCallback(async () => {
    setTargetsLoading(true);
    const poolFilters: TargetFilters = filters.categoryId
      ? { categoryId: filters.categoryId }
      : {};
    const [listRes, poolRes] = await Promise.all([
      getTargets(filters),
      getTargets(poolFilters),
    ]);
    if (listRes.success) setTargets(listRes.data);
    if (poolRes.success) setAssigneePool(poolRes.data);
    setTargetsLoading(false);
  }, [filters]);

  const assigneeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const target of assigneePool) {
      for (const id of target.assigneeIds) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [assigneePool]);

  const loadDashboard = useCallback(async () => {
    const res = await getTargetDashboard();
    if (res.success) setStats(res.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await Promise.all([loadStatic(), loadDashboard()]);
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [loadStatic, loadDashboard]);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  useEffect(() => {
    const onUpdate = () => {
      void loadStatic();
      void loadDashboard();
      void loadTargets();
    };
    window.addEventListener(TARGETS_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(TARGETS_UPDATED_EVENT, onUpdate);
  }, [loadStatic, loadDashboard, loadTargets]);

  // Drop stale category filter if the category was deleted from catalog.
  useEffect(() => {
    if (!filters.categoryId || categories.length === 0) return;
    if (!categoryMap.has(filters.categoryId)) {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.categoryId;
        return next;
      });
    }
  }, [categories, categoryMap, filters.categoryId]);

  function openCreate() {
    setEditingTarget(null);
    setAssignOpen(true);
  }

  function openEdit(target: PerformanceTarget) {
    setEditingTarget(target);
    setAssignOpen(true);
  }

  function openView(target: PerformanceTarget) {
    setViewingTarget(target);
  }

  async function onDeleteTarget(target: PerformanceTarget) {
    const res = await removeTarget(target.id);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("targets.list.deleted"));
    void loadTargets();
    void loadDashboard();
  }

  function onCategoryChange(categoryId: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (categoryId) next.categoryId = categoryId;
      else delete next.categoryId;
      return next;
    });
    if (tab === "dashboard" || tab === "catalog") {
      setTab("targets");
    }
  }

  function onCategoryFromChart(categoryId: string) {
    onCategoryChange(categoryId);
    setTab("targets");
  }

  if (!ready) return <PageSkeleton />;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("targets.page.eyebrow")}
        title={t("targets.page.title")}
        description={
          selectedCategory
            ? `${t("targets.page.description")} · ${selectedCategory.name}`
            : t("targets.page.description")
        }
        actions={
          canAssign ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("targets.assign.title")}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <TargetHubSidebar
            tab={tab}
            onTabChange={setTab}
            categories={categories}
            selectedCategoryId={filters.categoryId ?? ""}
            onCategoryChange={onCategoryChange}
            stats={stats}
            canManageCatalog={canManageCatalog}
            canViewReports={canViewReports}
          />
        </aside>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4 sm:space-y-5"
            >
              {tab === "dashboard" && stats ? (
                <>
                  <TargetKpiCards stats={stats} />
                  <TargetDashboardPanel
                    stats={stats}
                    employees={employeeMap}
                    onCategorySelect={onCategoryFromChart}
                  />
                </>
              ) : null}

              {tab === "targets" ? (
                isAdmin ? (
                  <>
                    <TargetFiltersBar
                      value={filters}
                      onChange={setFilters}
                      employees={employees}
                      assigneeCounts={assigneeCounts}
                    />
                    <TargetList
                      targets={targets}
                      categories={categoryMap}
                      employees={employeeMap}
                      loading={targetsLoading}
                      onView={openView}
                      onEdit={openEdit}
                      onDelete={onDeleteTarget}
                      onCreate={canAssign ? openCreate : undefined}
                      selectedAssigneeId={filters.employeeId}
                      onAssigneeSelect={(employeeId) =>
                        setFilters((prev) => {
                          const next = { ...prev };
                          if (employeeId) next.employeeId = employeeId;
                          else delete next.employeeId;
                          return next;
                        })
                      }
                    />
                  </>
                ) : (
                  <EmployeePerformancePanel
                    employeeId={workEmployeeId}
                    categories={categoryMap}
                    employees={employeeMap}
                    categoryId={filters.categoryId}
                  />
                )
              ) : null}

              {tab === "performance" && canViewReports ? (
                <PerformanceReportPanel
                  targets={targets}
                  categories={categoryMap}
                  employees={employeeMap}
                  categoryId={filters.categoryId}
                  onView={openView}
                  onEdit={isAdmin ? openEdit : undefined}
                />
              ) : null}

              {tab === "catalog" && canManageCatalog ? (
                <CatalogManager />
              ) : null}

              {tab === "warnings" ? (
                <WarningCenter targets={targets} employees={employeeMap} />
              ) : null}

              {tab === "delayed" ? (
                <DelayedCenter
                  categories={categoryMap}
                  employees={employeeMap}
                  categoryId={filters.categoryId}
                  onView={openView}
                  onEdit={isAdmin ? openEdit : undefined}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <TargetViewSheet
        target={viewingTarget}
        open={Boolean(viewingTarget)}
        onOpenChange={(open) => {
          if (!open) setViewingTarget(null);
        }}
        categories={categoryMap}
        employees={employeeMap}
        onEdit={isAdmin ? openEdit : undefined}
      />

      <TargetAssignSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        categories={categories}
        types={types}
        employees={employees}
        editingTarget={editingTarget}
        defaultCategoryId={filters.categoryId}
        onSaved={() => {
          void loadTargets();
          void loadDashboard();
        }}
      />
    </PageTransition>
  );
}
