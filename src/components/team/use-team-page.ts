"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { emptyTaskForm, type TaskFormState } from "@/components/work/admin-work-panel-types";
import { AppRole } from "@/constants/roles";
import { useLiveReload } from "@/hooks/use-live-reload";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated, TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import { toStorageIso } from "@/lib/flexible-datetime";
import { findDirectReports } from "@/lib/team";
import { getWorkforceEmployees, updateEmployee } from "@/services/employees.service";
import { getTargetCategories, getTargetTypes, getTargets } from "@/services/targets.service";
import { assignOrganicAdsQuota } from "@/services/organic-ads.service";
import { createWorkTask, getWorkTasks } from "@/services/work.service";
import { clampOrganicAdsQuantity } from "@/lib/organic-ads-task-match";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee } from "@/types";
import type { TargetCategory, TargetType } from "@/types/targets";
import type { WorkTask } from "@/types/work";

export function useTeamPage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const isAdmin = role === AppRole.admin;

  const [ready, setReady] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [targetCounts, setTargetCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [categories, setCategories] = useState<TargetCategory[]>([]);
  const [types, setTypes] = useState<TargetType[]>([]);
  const [query, setQuery] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetAssignees, setTargetAssignees] = useState<string[]>([]);
  const [managerBusyId, setManagerBusyId] = useState<string | null>(null);

  const reports = useMemo(() => {
    if (isAdmin) {
      return employees.filter((e) => e.status !== "inactive");
    }
    return findDirectReports(workEmployeeId, employees).filter(
      (e) => e.status !== "inactive"
    );
  }, [employees, isAdmin, workEmployeeId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q)
    );
  }, [query, reports]);

  const managerOptions = useMemo(
    () =>
      employees
        .filter((e) => e.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );

  const reload = useCallback(async () => {
    const [empRes, taskRes, targetRes, catRes, typeRes] = await Promise.all([
      getWorkforceEmployees(),
      getWorkTasks(isAdmin ? {} : { team: true }),
      getTargets(isAdmin ? {} : { team: true }),
      getTargetCategories(),
      getTargetTypes(),
    ]);
    if (empRes.success) setEmployees(empRes.data);
    if (taskRes.success) setTasks(taskRes.data);
    if (catRes.success) setCategories(catRes.data);
    if (typeRes.success) setTypes(typeRes.data);
    if (targetRes.success) {
      const counts = new Map<string, number>();
      for (const target of targetRes.data) {
        if (target.status === "completed" || target.status === "cancelled") {
          continue;
        }
        for (const id of target.assigneeIds) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      setTargetCounts(counts);
    }
    setReady(true);
  }, [isAdmin]);

  useLiveReload(reload, [WORK_UPDATED_EVENT, TARGETS_UPDATED_EVENT]);

  const openTaskCountByEmployee = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (task.status === "completed") continue;
      for (const id of task.assigneeIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [tasks]);

  function openAssignTask(employee: Employee) {
    setTaskForm({ ...emptyTaskForm(), assigneeIds: [employee.id] });
    setTaskOpen(true);
  }

  function openAssignTarget(employee: Employee) {
    setTargetAssignees([employee.id]);
    setTargetOpen(true);
  }

  async function saveTask() {
    if (!taskForm.title.trim() || taskForm.assigneeIds.length === 0) {
      toast.error(t("workAdmin.validationTask"));
      return;
    }
    setTaskBusy(true);
    if (taskForm.countsAsOrganicAd) {
      const res = await assignOrganicAdsQuota({
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        quantity: clampOrganicAdsQuantity(taskForm.organicAdsCount || 1),
        assigneeIds: taskForm.assigneeIds,
        dueDate: taskForm.dueDate
          ? toStorageIso(taskForm.dueDate, "end")
          : undefined,
        priority: taskForm.priority,
      });
      setTaskBusy(false);
      if (!res.success) {
        toast.error(res.message ?? t("common.error"));
        return;
      }
      setTaskOpen(false);
      emitTargetsUpdated();
      toast.success(t("workAdmin.organicAdsAssigned"));
      await reload();
      return;
    }
    const res = await createWorkTask({
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate
        ? toStorageIso(taskForm.dueDate, "exact")
        : "",
      tag: taskForm.tag.trim(),
      estimateMin: taskForm.estimateMin || 0,
      assigneeIds: taskForm.assigneeIds,
      origin: "assigned",
      requireEvidenceLinks: Boolean(taskForm.requireEvidenceLinks),
      requireEvidenceNotes: Boolean(taskForm.requireEvidenceNotes),
      subItems: taskForm.subItemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label) => ({ label, done: false })),
    });
    setTaskBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setTaskOpen(false);
    toast.success(t("workAdmin.taskCreated"));
    await reload();
  }

  async function assignManager(employeeId: string, managerEmployeeId: string) {
    setManagerBusyId(employeeId);
    const manager = employees.find((e) => e.id === managerEmployeeId);
    const res = await updateEmployee(employeeId, {
      managerEmployeeId: managerEmployeeId || "",
      manager: manager?.name ?? "",
    });
    setManagerBusyId(null);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("team.managerUpdated"));
    await reload();
  }

  return {
    t,
    ready,
    isAdmin,
    query,
    setQuery,
    visible,
    reports,
    employees,
    managerOptions,
    categories,
    types,
    targetAssignees,
    taskOpen,
    setTaskOpen,
    taskBusy,
    taskForm,
    setTaskForm,
    targetOpen,
    setTargetOpen,
    managerBusyId,
    openTaskCountByEmployee,
    targetCounts,
    openAssignTask,
    openAssignTarget,
    saveTask,
    assignManager,
    reload,
  };
}
