"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmList } from "@/lib/crm-normalize";
import {
  getCrmBusinessTypes,
  removeCrmBusinessType,
  upsertCrmBusinessType,
} from "@/services/crm.service";
import type { CrmBusinessType } from "@/types/crm";

interface Draft {
  id?: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

function emptyDraft(sortOrder = 0): Draft {
  return { name: "", description: "", active: true, sortOrder };
}

export function useCrmBusinessTypesPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CrmBusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  );

  const reload = useCallback(async () => {
    const res = await getCrmBusinessTypes();
    setItems(res.success ? ensureCrmList<CrmBusinessType>(res.data) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setDraft(emptyDraft(sorted.length));
    setFormOpen(true);
  }

  function openEdit(row: CrmBusinessType) {
    setDraft({
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
      sortOrder: row.sortOrder,
    });
    setFormOpen(true);
  }

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error(t("crm.businessTypes.nameRequired"));
      return;
    }
    setBusy(true);
    const res = await upsertCrmBusinessType({
      id: draft.id,
      name: draft.name.trim(),
      description: draft.description,
      active: draft.active,
      sortOrder: draft.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.businessTypeSaved"));
    setFormOpen(false);
    void reload();
  }

  async function onDelete(row: CrmBusinessType) {
    setBusy(true);
    const res = await removeCrmBusinessType(row.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.deleteFailed"));
      return;
    }
    toast.success(t("crm.toast.businessTypeDeleted"));
    void reload();
  }

  async function toggleActive(row: CrmBusinessType) {
    setBusy(true);
    const res = await upsertCrmBusinessType({
      id: row.id,
      name: row.name,
      description: row.description,
      active: !row.active,
      sortOrder: row.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
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
    openCreate,
    openEdit,
    onSave,
    onDelete,
    toggleActive,
  };
}
