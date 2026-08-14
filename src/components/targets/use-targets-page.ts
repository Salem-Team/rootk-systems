import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  getTargetCategories,
  getTargetDashboard,
  getTargetTypes,
  getTargets,
  removeTarget,
} from "@/services/targets.service";
import { useLiveReload } from "@/hooks/use-live-reload";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import { canTarget } from "@/lib/target-policies";
import { hasAnyPermissionId } from "@/constants/permissions";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetDashboardStats,
  TargetFilters,
  TargetType,
} from "@/types/targets";
import type { TargetHubTab } from "@/components/targets/target-hub-sidebar";

export function useTargetsPage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) =>
    s.authenticated ? s.permissions : undefined
  );
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const canAssign = canTarget(role, "assign", permissions);
  const canEdit = canTarget(role, "edit", permissions);
  const canManageCatalog = canTarget(role, "manage_categories", permissions);
  const canViewReports = canTarget(role, "view_reports", permissions);
  const canManageCompanyTargets = hasAnyPermissionId(
    ["targets.viewAll", "targets.viewTeam", "targets.assign", "targets.edit"],
    permissions,
    role
  );

  const [tab, setTab] = useState<TargetHubTab>(
    canManageCompanyTargets ? "dashboard" : "targets"
  );
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

  const loadTargets = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setTargetsLoading(true);
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

  useLiveReload(
    () => {
      void loadStatic();
      void loadDashboard();
      void loadTargets({ silent: true });
    },
    [TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT],
    { intervalMs: 40_000 }
  );

  useEffect(() => {
    setViewingTarget((current) => {
      if (!current) return current;
      return targets.find((t) => t.id === current.id) ?? current;
    });
  }, [targets]);

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

  return {
    canManageCompanyTargets,
    canAssign,
    canEdit,
    canManageCatalog,
    canViewReports,
    workEmployeeId,
    tab,
    setTab,
    categories,
    types,
    employees,
    targets,
    stats,
    filters,
    setFilters,
    ready,
    targetsLoading,
    assignOpen,
    setAssignOpen,
    editingTarget,
    viewingTarget,
    setViewingTarget,
    categoryMap,
    employeeMap,
    selectedCategory,
    assigneeCounts,
    loadTargets,
    loadDashboard,
    openCreate,
    openEdit,
    openView,
    onDeleteTarget,
    onCategoryChange,
    onCategoryFromChart,
  };
}
