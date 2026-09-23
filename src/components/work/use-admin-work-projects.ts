"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import {
  emptyProjectForm,
  normalizeProjectForm,
  projectToForm,
  type ProjectFormState,
} from "@/lib/work-project";
import {
  createWorkProject,
  deleteWorkProject,
  getWorkProjects,
  updateWorkProject,
} from "@/services/work.service";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import type { ProjectStatus, WorkProject } from "@/types/work-project";

export type ProjectStatusFilter = "all" | ProjectStatus;

export function useAdminWorkProjects(defaultLeadId: string) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(() => emptyProjectForm());
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const res = await getWorkProjects();
    if (res.success) setProjects(res.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  useEffect(() => {
    const onUpdate = () => {
      void reload();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        project.name,
        project.description,
        ...project.phases.flatMap((phase) => [
          phase.name,
          ...phase.tasks.map((task) => task.title),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query, statusFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyProjectForm(defaultLeadId));
    setSheetOpen(true);
  }

  function openEdit(project: WorkProject) {
    setEditingId(project.id);
    setForm(projectToForm(project));
    setSheetOpen(true);
  }

  async function save() {
    const payload = normalizeProjectForm(form);
    if (!payload) {
      toast.error(t("workAdmin.projects.validation"));
      return;
    }
    setBusy(true);
    const res = editingId
      ? await updateWorkProject(editingId, payload)
      : await createWorkProject(payload);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message || t("workAdmin.projects.validation"));
      return;
    }
    toast.success(
      editingId ? t("workAdmin.projects.updated") : t("workAdmin.projects.created")
    );
    setSheetOpen(false);
    await reload();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteWorkProject(deleteTarget.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message || t("workAdmin.projects.validation"));
      return;
    }
    toast.success(t("workAdmin.projects.deleted"));
    if (editingId === deleteTarget.id) setSheetOpen(false);
    setDeleteTarget(null);
    await reload();
  }

  return {
    projects,
    filtered,
    loading,
    busy,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    sheetOpen,
    setSheetOpen,
    editingId,
    form,
    setForm,
    deleteTarget,
    setDeleteTarget,
    openCreate,
    openEdit,
    save,
    confirmDelete,
  };
}
