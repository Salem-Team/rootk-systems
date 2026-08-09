import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmList } from "@/lib/crm-normalize";
import {
  getCrmStages,
  removeCrmStage,
  removeCrmSubStage,
  reorderCrmStageList,
  reorderCrmSubStageList,
  upsertCrmStage,
  upsertCrmSubStage,
} from "@/services/crm.service";
import type { CrmStage, CrmStageCategory, CrmSubStage } from "@/types/crm";

export const COLOR_SWATCHES = [
  "#082868",
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#64748b",
  "#15803d",
];

export interface StageDraft {
  id?: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  conversionProbability: number | null;
  category: CrmStageCategory;
  sortOrder: number;
}

function emptyDraft(sortOrder = 0): StageDraft {
  return {
    name: "",
    description: "",
    color: COLOR_SWATCHES[0],
    active: true,
    conversionProbability: null,
    category: "open",
    sortOrder,
  };
}

export interface SubStageDraft {
  id?: string;
  stageId: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

function emptySubDraft(stageId: string, sortOrder = 0): SubStageDraft {
  return {
    stageId,
    name: "",
    description: "",
    active: true,
    sortOrder,
  };
}

export function useCrmStagesPanel() {
  const { t } = useTranslation();
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<StageDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [moveToStageId, setMoveToStageId] = useState("");
  const [needsMove, setNeedsMove] = useState(false);
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [subDraft, setSubDraft] = useState<SubStageDraft>(emptySubDraft(""));
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  );

  const reload = useCallback(async () => {
    const res = await getCrmStages();
    if (res.success) {
      setStages(ensureCrmList<CrmStage>(res.data));
    } else {
      setStages([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setDraft(emptyDraft(sorted.length));
    setFormOpen(true);
  }

  function openEdit(stage: CrmStage) {
    setDraft({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      color: stage.color,
      active: stage.active,
      conversionProbability: stage.conversionProbability,
      category: stage.category,
      sortOrder: stage.sortOrder,
    });
    setFormOpen(true);
  }

  function openDuplicate(stage: CrmStage) {
    setDraft({
      name: `${stage.name} (copy)`,
      description: stage.description,
      color: stage.color,
      active: stage.active,
      conversionProbability: stage.conversionProbability,
      category: stage.category,
      sortOrder: sorted.length,
    });
    setFormOpen(true);
  }

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error(t("crm.leadForm.validation"));
      return;
    }
    setBusy(true);
    const res = await upsertCrmStage({
      id: draft.id,
      name: draft.name.trim(),
      description: draft.description,
      color: draft.color,
      active: draft.active,
      conversionProbability: draft.conversionProbability,
      category: draft.category,
      sortOrder: draft.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.stageSaved"));
    setFormOpen(false);
    void reload();
  }

  async function toggleActive(stage: CrmStage) {
    setBusy(true);
    const res = await upsertCrmStage({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      color: stage.color,
      active: !stage.active,
      conversionProbability: stage.conversionProbability,
      category: stage.category,
      sortOrder: stage.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    void reload();
  }

  async function move(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= sorted.length) return;
    const ids = sorted.map((s) => s.id);
    const tmp = ids[index];
    ids[index] = ids[nextIndex];
    ids[nextIndex] = tmp;
    setBusy(true);
    const res = await reorderCrmStageList(ids);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    if (res.success) setStages(ensureCrmList<CrmStage>(res.data));
  }

  function askDelete(stage: CrmStage) {
    setDeleteId(stage.id);
    setLeadCount(0);
    setNeedsMove(false);
    setMoveToStageId("");
  }

  function cancelDelete() {
    setDeleteId(null);
    setNeedsMove(false);
  }

  function openCreateSub(stage: CrmStage) {
    const count = (stage.subStages ?? []).length;
    setSubDraft(emptySubDraft(stage.id, count));
    setExpandedStageId(stage.id);
    setSubFormOpen(true);
  }

  function openEditSub(sub: CrmSubStage) {
    setSubDraft({
      id: sub.id,
      stageId: sub.stageId,
      name: sub.name,
      description: sub.description,
      active: sub.active,
      sortOrder: sub.sortOrder,
    });
    setExpandedStageId(sub.stageId);
    setSubFormOpen(true);
  }

  async function onSaveSub() {
    if (!subDraft.name.trim() || !subDraft.stageId) {
      toast.error(t("crm.leadForm.validation"));
      return;
    }
    setBusy(true);
    const res = await upsertCrmSubStage({
      id: subDraft.id,
      stageId: subDraft.stageId,
      name: subDraft.name.trim(),
      description: subDraft.description,
      active: subDraft.active,
      sortOrder: subDraft.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.subStageSaved"));
    setSubFormOpen(false);
    void reload();
  }

  async function toggleSubActive(sub: CrmSubStage) {
    setBusy(true);
    const res = await upsertCrmSubStage({
      id: sub.id,
      stageId: sub.stageId,
      name: sub.name,
      description: sub.description,
      active: !sub.active,
      sortOrder: sub.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    void reload();
  }

  async function moveSub(stageId: string, index: number, dir: -1 | 1) {
    const stage = sorted.find((s) => s.id === stageId);
    const list = [...(stage?.subStages ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const ids = list.map((s) => s.id);
    const tmp = ids[index];
    ids[index] = ids[nextIndex];
    ids[nextIndex] = tmp;
    setBusy(true);
    const res = await reorderCrmSubStageList(stageId, ids);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    void reload();
  }

  async function deleteSub(sub: CrmSubStage) {
    setBusy(true);
    const res = await removeCrmSubStage(sub.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.deleteFailed"));
      return;
    }
    toast.success(t("crm.toast.subStageDeleted"));
    void reload();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setBusy(true);
    const res = await removeCrmStage(
      deleteId,
      needsMove ? moveToStageId || undefined : undefined
    );
    setBusy(false);

    if (!res.success) {
      const details = res.error?.details as
        | { leadCount?: number; code?: string }
        | undefined;
      const countFromDetails =
        typeof details?.leadCount === "number" ? details.leadCount : undefined;
      const count =
        res.data?.leadCount ??
        countFromDetails ??
        (() => {
          const match = (res.message ?? "").match(/(\d+)\s+leads?/i);
          return match ? Number(match[1]) : undefined;
        })();
      const nestCode = details?.code;
      if (
        res.error?.code === "STAGE_HAS_LEADS" ||
        nestCode === "STAGE_HAS_LEADS" ||
        typeof count === "number" ||
        (res.message ?? "").toLowerCase().includes("lead")
      ) {
        setNeedsMove(true);
        setLeadCount(count ?? 0);
        toast.error(
          t("crm.errors.stageHasLeads", {
            count: String(count ?? 0),
          })
        );
        return;
      }
      toast.error(res.message || t("crm.errors.deleteFailed"));
      return;
    }

    toast.success(t("crm.toast.stageDeleted"));
    setDeleteId(null);
    setNeedsMove(false);
    void reload();
  }

  return {
    t,
    sorted,
    loading,
    formOpen,
    setFormOpen,
    draft,
    setDraft,
    busy,
    deleteId,
    leadCount,
    moveToStageId,
    setMoveToStageId,
    needsMove,
    subFormOpen,
    setSubFormOpen,
    subDraft,
    setSubDraft,
    expandedStageId,
    setExpandedStageId,
    openCreate,
    openEdit,
    openDuplicate,
    onSave,
    toggleActive,
    move,
    askDelete,
    cancelDelete,
    confirmDelete,
    openCreateSub,
    openEditSub,
    onSaveSub,
    toggleSubActive,
    moveSub,
    deleteSub,
  };
}
